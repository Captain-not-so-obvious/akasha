import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  identifyFranchise,
  extractFranchiseCoreTitle,
  getUserTransmediaRecommendations,
  getUserArchiveStats,
  CANONICAL_FRANCHISES,
} from '../../src/services/transmedia.service.js';
import { prisma } from '../../src/lib/prisma.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/tmdb.service.js', () => ({
  searchMedia: vi.fn().mockResolvedValue({
    results: [
      {
        id: 550,
        title: 'Fundação',
        mediaType: 'tv',
        overview: 'Adaptação seriada de ficção científica.',
        posterUrl: 'https://image.tmdb.org/poster.jpg',
        releaseDate: '2021-09-24',
      },
    ],
    totalResults: 1,
    totalPages: 1,
  }),
}));

vi.mock('../../src/services/igdb.service.js', () => ({
  searchGames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/services/books.service.js', () => ({
  searchBooks: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/services/comics.service.js', () => ({
  searchComics: vi.fn().mockResolvedValue([]),
}));

describe('Transmedia Service - Unit Tests', () => {
  const mockUserId = 'usr-transmedia-uuid-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractFranchiseCoreTitle', () => {
    it('deve extrair a raiz do título removendo subtítulos e volumes', () => {
      expect(extractFranchiseCoreTitle('The Witcher 3: Wild Hunt')).toBe('The Witcher 3');
      expect(extractFranchiseCoreTitle('Duna: Volume 1')).toBe('Duna');
      expect(extractFranchiseCoreTitle('Fundação: A Trilogia')).toBe('Fundação');
      expect(extractFranchiseCoreTitle('O Senhor dos Anéis: A Sociedade do Anel')).toBe('O Senhor dos Anéis');
      expect(extractFranchiseCoreTitle('Cyberpunk 2077 (Saga)')).toBe('Cyberpunk 2077');
    });
  });

  describe('identifyFranchise', () => {
    it('deve identificar franquia The Witcher por título do jogo', () => {
      const match = identifyFranchise('The Witcher 3: Wild Hunt', '1942', 'game');
      expect(match).not.toBeNull();
      expect(match?.id).toBe('witcher');
      expect(match?.name).toBe('The Witcher');
    });

    it('deve identificar Duna pelo livro ou apelidos', () => {
      const match = identifyFranchise('Duna: Volume 1', 'kC40DwAAQBAJ', 'book');
      expect(match).not.toBeNull();
      expect(match?.id).toBe('dune');
    });

    it('deve identificar The Last of Us pela série de TV', () => {
      const match = identifyFranchise('The Last of Us', '100088', 'tv');
      expect(match).not.toBeNull();
      expect(match?.id).toBe('tlou');
    });

    it('deve retornar null para obras que não pertencem a universos cadastrados', () => {
      const match = identifyFranchise('Documentário Aleatório Sobre Culinária', '999999', 'movie');
      expect(match).toBeNull();
    });
  });

  describe('getUserTransmediaRecommendations', () => {
    it('deve gerar pontes transmídia para mídias não consumidas quando o usuário possui uma obra de uma franquia', async () => {
      // O usuário possui apenas o Jogo The Witcher 3
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([
        {
          id: 1,
          userId: mockUserId,
          domain: 'game',
          externalId: '1942',
          title: 'The Witcher 3: Wild Hunt',
          status: 'completed',
          userRating: 5,
          tmdbId: null,
          mediaType: null,
          notes: null,
          coverUrl: null,
          releaseYear: 2015,
          extraMeta: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      const recs = await getUserTransmediaRecommendations(mockUserId, 5);

      expect(recs.length).toBeGreaterThan(0);
      // Deve recomendar o livro ou a série ou a HQ do Witcher
      const witcherBook = recs.find((r) => r.targetItem.domain === 'book');
      expect(witcherBook).toBeDefined();
      expect(witcherBook?.franchiseName).toBe('The Witcher');
      expect(witcherBook?.sourceItem.title).toBe('The Witcher 3: Wild Hunt');
      expect(witcherBook?.score).toBeGreaterThan(90);
      expect(witcherBook?.reason).toContain('The Witcher 3');
    });

    it('não deve recomendar itens que o usuário já adicionou ao acervo', async () => {
      // O usuário possui o Jogo E o Livro do Witcher
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([
        {
          id: 1,
          userId: mockUserId,
          domain: 'game',
          externalId: '1942',
          title: 'The Witcher 3: Wild Hunt',
          status: 'completed',
          userRating: 5,
        },
        {
          id: 2,
          userId: mockUserId,
          domain: 'book',
          externalId: 'yv_2DwAAQBAJ',
          title: 'O Último Desejo (Saga O Bruxo - Vol. 1)',
          status: 'completed',
          userRating: 5,
        },
      ] as any);

      const recs = await getUserTransmediaRecommendations(mockUserId, 10);
      // O livro yv_2DwAAQBAJ não deve ser recomendado de novo
      const duplicateBook = recs.find((r) => r.targetItem.externalId === 'yv_2DwAAQBAJ');
      expect(duplicateBook).toBeUndefined();
    });

    it('deve retornar recomendações canônicas de Cold Start quando o acervo estiver vazio', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([]);

      const recs = await getUserTransmediaRecommendations(mockUserId, 6);
      expect(recs.length).toBe(6);
      expect(recs[0].isColdStart).toBe(true);
      expect(recs[0].reason).toContain('Conexão Transmídia Canônica');
    });

    it('deve gerar recomendação fluída via APIs reais para obras fora do catálogo canônico', async () => {
      // O usuário possui o livro "Fundação", que não está no CANONICAL_FRANCHISES
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([
        {
          id: 99,
          userId: mockUserId,
          domain: 'book',
          externalId: 'b-fundacao-1',
          title: 'Fundação: A Trilogia',
          status: 'completed',
          userRating: 5,
        },
      ] as any);

      const recs = await getUserTransmediaRecommendations(mockUserId, 5);

      // Deve encontrar a série "Fundação" retornada dinamicamente pelo TMDB
      const fundacaoTv = recs.find((r) => r.targetItem.title === 'Fundação');
      expect(fundacaoTv).toBeDefined();
      expect(fundacaoTv?.targetItem.domain).toBe('tv');
      expect(fundacaoTv?.sourceItem.title).toBe('Fundação: A Trilogia');
      expect(fundacaoTv?.isColdStart).toBe(false);
      expect(fundacaoTv?.reason).toContain('conexão dinâmica');
    });

    it('deve recomendar Batman: Arkham City com ID 501 oficial da IGDB e capa correta quando o usuário possuir Batman nos quadrinhos', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([
        {
          id: 10,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'cv-4050-3944',
          title: 'Batman: The Dark Knight Returns',
          status: 'completed',
          userRating: 5,
        },
      ] as any);

      const recs = await getUserTransmediaRecommendations(mockUserId, 5);

      const batmanGame = recs.find((r) => r.targetItem.domain === 'game');
      expect(batmanGame).toBeDefined();
      expect(batmanGame?.targetItem.title).toBe('Batman: Arkham City');
      // ID deve ser estritamente 501 (IGDB real), nunca 462 (Simon the Sorcerer)
      expect(batmanGame?.targetItem.externalId).toBe('501');
      // A capa deve ser a oficial do Arkham City
      expect(batmanGame?.targetItem.coverUrl).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co1voh.jpg');
      expect(batmanGame?.targetItem.releaseYear).toBe(2011);
    });
  });

  describe('getUserArchiveStats', () => {
    it('deve calcular corretamente as métricas e o Índice de Amplitude Cultural para um acervo diversificado', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([
        {
          id: 1,
          userId: mockUserId,
          domain: 'movie',
          externalId: '120',
          title: 'O Senhor dos Anéis',
          status: 'completed',
          userRating: 5,
          extraMeta: null,
        },
        {
          id: 2,
          userId: mockUserId,
          domain: 'game',
          externalId: '1942',
          title: 'The Witcher 3',
          status: 'completed',
          userRating: 5,
          extraMeta: null,
        },
        {
          id: 3,
          userId: mockUserId,
          domain: 'book',
          externalId: 'kC40DwAAQBAJ',
          title: 'Duna',
          status: 'completed',
          userRating: 4,
          extraMeta: { pageCount: 680 },
        },
        {
          id: 4,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'cv-batman-dkr',
          title: 'Batman: O Cavaleiro das Trevas',
          status: 'completed',
          userRating: 5,
          extraMeta: null,
        },
        {
          id: 5,
          userId: mockUserId,
          domain: 'tv',
          externalId: '94605',
          title: 'Arcane',
          status: 'completed',
          userRating: 5,
          extraMeta: null,
        },
      ] as any);

      const stats = await getUserArchiveStats(mockUserId);

      expect(stats.totalItems).toBe(5);
      expect(stats.statusBreakdown.completed.count).toBe(5);
      expect(stats.domainBreakdown.movie.count).toBe(1);
      expect(stats.domainBreakdown.game.count).toBe(1);
      expect(stats.domainBreakdown.book.count).toBe(1);
      expect(stats.domainBreakdown.comic.count).toBe(1);
      expect(stats.domainBreakdown.tv.count).toBe(1);

      // Consumo estimado
      expect(stats.consumptionMetrics.estimatedScreenHours).toBeGreaterThan(0);
      expect(stats.consumptionMetrics.estimatedGameHours).toBe(35);
      expect(stats.consumptionMetrics.estimatedPagesRead).toBe(680);
      expect(stats.consumptionMetrics.totalComicVolumes).toBe(1);

      // Média de notas
      expect(stats.ratingStats.average).toBeCloseTo(4.8);
      expect(stats.ratingStats.ratedCount).toBe(5);

      // Diversidade Cultural (5 domínios perfeitamente balanceados)
      expect(stats.diversityIndex.score).toBeGreaterThanOrEqual(80);
      expect(stats.diversityIndex.archetypeTitle).toBe('Polímata Transmídia');
    });

    it('deve identificar perfil de Cinéfilo Devoto quando a vasta maioria das obras for audiovisual', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValueOnce([
        { id: 1, userId: mockUserId, domain: 'movie', externalId: '1', title: 'Filme 1', status: 'completed', userRating: 4 },
        { id: 2, userId: mockUserId, domain: 'movie', externalId: '2', title: 'Filme 2', status: 'completed', userRating: 4 },
        { id: 3, userId: mockUserId, domain: 'movie', externalId: '3', title: 'Filme 3', status: 'completed', userRating: 5 },
        { id: 4, userId: mockUserId, domain: 'tv', externalId: '4', title: 'Série 1', status: 'completed', userRating: 5 },
      ] as any);

      const stats = await getUserArchiveStats(mockUserId);
      expect(stats.diversityIndex.archetypeTitle).toBe('Cinéfilo Devoto');
    });
  });
});
