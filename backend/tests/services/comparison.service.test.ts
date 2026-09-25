import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateAffinity,
  compareUserLibraries,
  hydrateMediaBatch,
} from '../../src/services/comparison.service.js';
import { prisma } from '../../src/lib/prisma.js';
import * as tmdbService from '../../src/services/tmdb.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
    activity: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/tmdb.service.js', () => ({
  fetchMediaDetails: vi.fn(),
}));

describe('Serviço de Comparação de Acervos & Afinidade Cósmica (SPEC-006)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateAffinity', () => {
    it('deve retornar 0% e Caos Gravitacional quando ambos os acervos forem vazios', () => {
      const result = calculateAffinity([], []);
      expect(result.percentage).toBe(30); // 0% jaccard + 50% neutro = 30%
      expect(result.label).toBe('Caos Gravitacional');
      expect(result.totalShared).toBe(0);
      expect(result.totalOverlapRated).toBe(0);
    });

    it('deve calcular 100% e Almas Cósmicas quando acervos e notas forem idênticos', () => {
      const items = [
        {
          id: 1,
          userId: 'user-1',
          tmdbId: 101,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 5,
          notes: 'Sensacional',
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: 'user-1',
          tmdbId: 102,
          mediaType: 'tv' as const,
          status: 'completed' as const,
          userRating: 4,
          notes: 'Muito bom',
          updatedAt: new Date(),
        },
      ];

      const friendItems = items.map((i) => ({ ...i, id: i.id + 10, userId: 'user-2' }));

      const result = calculateAffinity(items, friendItems);
      expect(result.percentage).toBe(100);
      expect(result.label).toBe('Almas Cósmicas');
      expect(result.totalShared).toBe(2);
      expect(result.totalOverlapRated).toBe(2);
    });

    it('deve penalizar notas divergentes no score de afinidade', () => {
      const myItems = [
        {
          id: 1,
          userId: 'user-1',
          tmdbId: 101,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 5,
          notes: null,
          updatedAt: new Date(),
        },
      ];

      const friendItems = [
        {
          id: 2,
          userId: 'user-2',
          tmdbId: 101,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 1, // Diferença máxima de 4 estrelas
          notes: null,
          updatedAt: new Date(),
        },
      ];

      const result = calculateAffinity(myItems, friendItems);
      // Overlap = 100%. Diferença = 4 -> ratingScore = 0%.
      // Total = 0.4*100 + 0.6*0 = 40%
      expect(result.percentage).toBe(40);
      expect(result.label).toBe('Caos Gravitacional');
    });

    it('deve classificar Frequência Harmônica quando a concordância for alta', () => {
      const myItems = [
        {
          id: 1,
          userId: 'user-1',
          tmdbId: 101,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 5,
          notes: null,
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: 'user-1',
          tmdbId: 102,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 4,
          notes: null,
          updatedAt: new Date(),
        },
      ];

      const friendItems = [
        {
          id: 3,
          userId: 'user-2',
          tmdbId: 101,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 4, // 1 estrela de diferença
          notes: null,
          updatedAt: new Date(),
        },
        {
          id: 4,
          userId: 'user-2',
          tmdbId: 102,
          mediaType: 'movie' as const,
          status: 'completed' as const,
          userRating: 3, // 1 estrela de diferença (total diff = 2)
          notes: null,
          updatedAt: new Date(),
        },
      ];

      const result = calculateAffinity(myItems, friendItems);
      expect(result.percentage).toBeGreaterThanOrEqual(75);
      expect(result.label).toBe('Frequência Harmônica');
    });
  });

  describe('hydrateMediaBatch', () => {
    it('deve buscar metadados de Activity primeiro e TMDB como fallback', async () => {
      vi.mocked(prisma.activity.findMany).mockResolvedValue([
        {
          id: 1,
          userId: 'user-1',
          type: 'ADDED_TO_LIST',
          tmdbId: 550,
          mediaType: 'movie',
          title: 'Clube da Luta',
          posterPath: '/clube.jpg',
          userRating: 5,
          status: 'completed',
          review: null,
          createdAt: new Date(),
        },
      ]);

      vi.mocked(tmdbService.fetchMediaDetails).mockResolvedValue({
        id: 999,
        title: 'Interestelar',
        overview: 'Espaço',
        posterUrl: '/interestelar.jpg',
        backdropUrl: null,
        releaseDate: '2014-11-07',
        mediaType: 'movie',
        voteAverage: 8.6,
      });

      const map = await hydrateMediaBatch([
        { tmdbId: 550, mediaType: 'movie' },
        { tmdbId: 999, mediaType: 'movie' },
      ]);

      expect(map.get('movie:550')).toEqual({
        title: 'Clube da Luta',
        posterUrl: '/clube.jpg',
      });
      expect(map.get('movie:999')).toEqual({
        title: 'Interestelar',
        posterUrl: '/interestelar.jpg',
      });
      // Verifica que TMDB só foi chamado para a mídia ausente em Activity
      expect(tmdbService.fetchMediaDetails).toHaveBeenCalledWith(999, 'movie');
      expect(tmdbService.fetchMediaDetails).not.toHaveBeenCalledWith(550, 'movie');
    });
  });

  describe('compareUserLibraries', () => {
    it('deve estruturar corretamente watchTogether, ratedOverlap e friendRecommendations', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: 'friend-uuid',
        username: 'cinefilo_amigo',
        avatarUrl: null,
        friendCode: 'AK-1234-5678',
      });

      vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
      vi.mocked(tmdbService.fetchMediaDetails).mockImplementation(async (id) => ({
        id,
        title: `Mídia ${id}`,
        overview: 'Sinopse',
        posterUrl: `/poster-${id}.jpg`,
        backdropUrl: null,
        releaseDate: '2023-01-01',
        mediaType: 'movie',
        voteAverage: 8,
      }));

      // Usuário 1:
      // - 100: plan_to_watch
      // - 200: completed (nota 5, 'Adorei')
      vi.mocked(prisma.wishlist.findMany)
        .mockResolvedValueOnce([
          {
            id: 1,
            userId: 'user-1',
            tmdbId: 100,
            mediaType: 'movie',
            status: 'plan_to_watch',
            userRating: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            userId: 'user-1',
            tmdbId: 200,
            mediaType: 'movie',
            status: 'completed',
            userRating: 5,
            notes: 'Adorei',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        // Amigo:
        // - 100: plan_to_watch (em comum com user-1 -> watchTogether)
        // - 200: completed (nota 4, 'Muito bom' -> ratedOverlap)
        // - 300: completed (nota 5 -> friendRecommendations)
        .mockResolvedValueOnce([
          {
            id: 3,
            userId: 'friend-uuid',
            tmdbId: 100,
            mediaType: 'movie',
            status: 'plan_to_watch',
            userRating: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 4,
            userId: 'friend-uuid',
            tmdbId: 200,
            mediaType: 'movie',
            status: 'completed',
            userRating: 4,
            notes: 'Muito bom',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 5,
            userId: 'friend-uuid',
            tmdbId: 300,
            mediaType: 'movie',
            status: 'completed',
            userRating: 5,
            notes: 'Espetacular',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

      const result = await compareUserLibraries('user-1', 'friend-uuid');
      expect(result).not.toBeNull();
      expect(result!.friend.username).toBe('cinefilo_amigo');

      // 1. watchTogether deve conter 100
      expect(result!.watchTogether).toHaveLength(1);
      expect(result!.watchTogether[0].tmdbId).toBe(100);

      // 2. ratedOverlap deve conter 200 com notas e resenhas
      expect(result!.ratedOverlap).toHaveLength(1);
      expect(result!.ratedOverlap[0].tmdbId).toBe(200);
      expect(result!.ratedOverlap[0].myRating).toBe(5);
      expect(result!.ratedOverlap[0].friendRating).toBe(4);
      expect(result!.ratedOverlap[0].delta).toBe(1);

      // 3. friendRecommendations deve conter 300
      expect(result!.friendRecommendations).toHaveLength(1);
      expect(result!.friendRecommendations[0].tmdbId).toBe(300);
      expect(result!.friendRecommendations[0].friendRating).toBe(5);
      expect(result!.friendRecommendations[0].inMyBacklog).toBe(false);
    });
  });
});
