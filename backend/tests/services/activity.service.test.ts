import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordActivity, getFeedForUser } from '../../src/services/activity.service.js';
import { prisma } from '../../src/lib/prisma.js';
import * as tmdbService from '../../src/services/tmdb.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn().mockReturnValue({ catch: vi.fn() }),
      count: vi.fn(),
    },
    friendship: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/tmdb.service.js', () => ({
  fetchMediaDetails: vi.fn(),
}));

describe('Activity Service - Unit Tests', () => {
  const mockUserId = 'user-uuid-1';
  const mockFriendId = 'user-uuid-2';
  const mockBlockedId = 'user-uuid-3';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve registrar uma atividade com sucesso incluindo opinião/resenha', async () => {
    const mockActivityData = {
      id: 1,
      userId: mockUserId,
      type: 'RATED_MEDIA' as const,
      tmdbId: 100,
      mediaType: 'movie' as const,
      title: 'Clube da Luta',
      posterPath: '/poster.jpg',
      userRating: 5,
      status: 'completed' as const,
      review: 'Obra-prima do cinema moderno',
      createdAt: new Date(),
    };

    vi.mocked(prisma.activity.create).mockResolvedValue(mockActivityData);

    const result = await recordActivity({
      userId: mockUserId,
      type: 'RATED_MEDIA',
      tmdbId: 100,
      mediaType: 'movie',
      title: 'Clube da Luta',
      posterPath: '/poster.jpg',
      userRating: 5,
      status: 'completed',
      review: 'Obra-prima do cinema moderno',
    });

    expect(result).toEqual(mockActivityData);
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        type: 'RATED_MEDIA',
        tmdbId: 100,
        mediaType: 'movie',
        title: 'Clube da Luta',
        posterPath: '/poster.jpg',
        userRating: 5,
        status: 'completed',
        review: 'Obra-prima do cinema moderno',
      },
    });
  });

  it('deve retornar apenas atividades de amigos confirmados e ignorar usuários bloqueados', async () => {
    // Mock de amizades: amizade aceita com mockFriendId, amizade bloqueada com mockBlockedId
    vi.mocked(prisma.friendship.findMany)
      .mockResolvedValueOnce([
        {
          id: 1,
          requesterId: mockUserId,
          addresseeId: mockFriendId,
          status: 'accepted',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          requesterId: mockUserId,
          addresseeId: mockBlockedId,
          status: 'blocked',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

    const mockActivities = [
      {
        id: 10,
        userId: mockFriendId,
        type: 'STATUS_CHANGED' as const,
        tmdbId: 200,
        mediaType: 'tv' as const,
        title: 'Breaking Bad',
        posterPath: '/bb.jpg',
        userRating: null,
        status: 'watching' as const,
        createdAt: new Date(),
        profile: {
          id: mockFriendId,
          username: 'amigo_legal',
          avatarUrl: null,
        },
      },
    ];

    vi.mocked(prisma.activity.findMany).mockResolvedValue(mockActivities);
    vi.mocked(prisma.activity.count).mockResolvedValue(1);

    const feed = await getFeedForUser(mockUserId, 1, 20);

    expect(feed.activities.length).toBe(1);
    expect(feed.pagination.total).toBe(1);
    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { in: [mockUserId, mockFriendId] },
        },
      })
    );
  });

  it('deve buscar automaticamente dados no TMDB ao registrar atividade se title e posterPath forem omitidos', async () => {
    vi.mocked(tmdbService.fetchMediaDetails).mockResolvedValueOnce({
      id: 550,
      title: 'Clube da Luta TMDB',
      overview: 'Sinopse...',
      posterUrl: 'https://image.tmdb.org/t/p/w500/poster_tmdb.jpg',
      backdropUrl: null,
      releaseDate: '1999-10-15',
      mediaType: 'movie',
      voteAverage: 8.4,
    });

    vi.mocked(prisma.activity.create).mockResolvedValueOnce({
      id: 2,
      userId: mockUserId,
      type: 'ADDED_TO_LIST',
      tmdbId: 550,
      mediaType: 'movie',
      title: 'Clube da Luta TMDB',
      posterPath: 'https://image.tmdb.org/t/p/w500/poster_tmdb.jpg',
      userRating: null,
      status: 'plan_to_watch',
      createdAt: new Date(),
    } as any);

    await recordActivity({
      userId: mockUserId,
      type: 'ADDED_TO_LIST',
      tmdbId: 550,
      mediaType: 'movie',
    });

    expect(tmdbService.fetchMediaDetails).toHaveBeenCalledWith(550, 'movie');
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Clube da Luta TMDB',
        posterPath: 'https://image.tmdb.org/t/p/w500/poster_tmdb.jpg',
      }),
    });
  });

  it('deve curar e enriquecer registros legados sem título no getFeedForUser', async () => {
    vi.mocked(prisma.friendship.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const legacyActivity = {
      id: 99,
      userId: mockUserId,
      type: 'ADDED_TO_LIST' as const,
      tmdbId: 1155089,
      mediaType: 'movie' as const,
      title: null,
      posterPath: null,
      userRating: null,
      status: 'plan_to_watch' as const,
      createdAt: new Date(),
      profile: {
        id: mockUserId,
        username: 'fillipe_moreira',
        avatarUrl: null,
      },
    };

    vi.mocked(prisma.activity.findMany).mockResolvedValueOnce([legacyActivity]);
    vi.mocked(prisma.activity.count).mockResolvedValueOnce(1);

    vi.mocked(tmdbService.fetchMediaDetails).mockResolvedValueOnce({
      id: 1155089,
      title: 'Filme Curado pelo TMDB',
      overview: 'Sinopse...',
      posterUrl: 'https://image.tmdb.org/t/p/w500/curado.jpg',
      backdropUrl: null,
      releaseDate: '2024-01-01',
      mediaType: 'movie',
      voteAverage: 7.5,
    });

    const feed = await getFeedForUser(mockUserId, 1, 20);

    expect(feed.activities[0].title).toBe('Filme Curado pelo TMDB');
    expect(feed.activities[0].posterPath).toBe('https://image.tmdb.org/t/p/w500/curado.jpg');
  });
});
