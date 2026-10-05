import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateComicWeight,
  extractSeriesCore,
  getUserComicRecommendations,
  getColdStartComicRecommendations,
  buildUserComicProfile,
  calculateComicAffinity,
  normalizeGenre,
} from '../../src/services/comic-recommendation.service.js';
import { prisma } from '../../src/lib/prisma.js';
import * as comicsService from '../../src/services/comics.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/comics.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof comicsService>();
  return {
    ...actual,
    searchComics: vi.fn(),
    fetchPopularComics: vi.fn(),
    fetchMangaRecommendationsFromAniList: vi.fn(),
    fetchMangaByGenresFromAniList: vi.fn(),
  };
});

describe('Comic Recommendation Service - Unit Tests', () => {
  const mockUserId = 'user-comic-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractSeriesCore (Dynamic NLP)', () => {
    it('deve extrair dinamicamente o núcleo de sagas com subtítulos', () => {
      expect(extractSeriesCore('Batman: The Killing Joke')).toBe('Batman');
      expect(extractSeriesCore('Spider-Man - Blue')).toBe('Spider-Man');
      expect(extractSeriesCore('Berserk: The Flame Dragon Knight')).toBe('Berserk');
    });

    it('deve remover numerais romanos e edições no final', () => {
      expect(extractSeriesCore('Civil War II')).toBe('Civil War');
      expect(extractSeriesCore('Spawn 300')).toBe('Spawn');
    });

    it('deve remover referências de volume e ano', () => {
      expect(extractSeriesCore('Saga Vol. 1')).toBe('Saga');
      expect(extractSeriesCore('Invincible (2003)')).toBe('Invincible');
    });

    it('deve manter o título inalterado caso seja uma única palavra ou não tenha delimitadores', () => {
      expect(extractSeriesCore('Watchmen')).toBe('Watchmen');
      expect(extractSeriesCore('One Piece')).toBe('One Piece');
    });
  });

  describe('calculateComicWeight', () => {
    it('deve atribuir peso fortemente negativo (-3.0) para status dropped', () => {
      const weight = calculateComicWeight({
        externalId: 'cv-4050-dropped',
        title: 'HQ Abandonada',
        userRating: 5,
        status: 'dropped',
      });
      expect(weight).toBe(-3.0);
    });

    it('deve calcular corretamente peso positivo com multiplicador de status completed (1.5x)', () => {
      const weight = calculateComicWeight({
        externalId: 'cv-4050-3622',
        title: 'Watchmen',
        userRating: 5,
        status: 'completed',
      });
      // 3.0 * 1.5 = 4.5
      expect(weight).toBe(4.5);
    });

    it('deve calcular corretamente peso com status watching / lendo (1.2x)', () => {
      const weight = calculateComicWeight({
        externalId: 'al-30002',
        title: 'Berserk',
        userRating: 4,
        status: 'watching',
      });
      // 2.0 * 1.2 = 2.4
      expect(weight).toBeCloseTo(2.4);
    });

    it('deve calcular peso negativo para avaliações ruins (1 ou 2 estrelas)', () => {
      const weight1 = calculateComicWeight({
        externalId: 'cv-bad-1',
        title: 'HQ Ruim',
        userRating: 1,
        status: 'completed',
      });
      const weight2 = calculateComicWeight({
        externalId: 'cv-bad-2',
        title: 'HQ Mediana',
        userRating: 2,
        status: 'completed',
      });
      expect(weight1).toBeLessThan(0);
      expect(weight2).toBeLessThan(0);
    });
  });

  describe('Cold Start Recommendations', () => {
    it('deve retornar clássicos de Cold Start quando o usuário não tiver histórico avaliado', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([]);

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].score).toBe(90);
      expect(recs[0].reason).toContain('Saga essencial e aclamada');
    });

    it('deve excluir itens já presentes na wishlist do usuário no Cold Start', async () => {
      const existing = new Set(['cv-4050-53871']);
      const existingTitles = new Set(['watchmen']);
      const coldStart = await getColdStartComicRecommendations(existing, existingTitles, 5);
      expect(coldStart.some((c) => c.id === 'cv-4050-53871')).toBe(false);
      expect(coldStart.some((c) => c.title.toLowerCase() === 'watchmen')).toBe(false);
    });
  });

  describe('Personalized Recommendations & Dynamic Information Retrieval', () => {
    it('recomenda sagas correlatas do mesmo universo dinamicamente para quem avaliou Batman com 5★', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'cv-4050-killing-joke',
          title: 'Batman: The Killing Joke',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            genres: ['Quadrinhos', 'HQ Ocidental', 'DC Comics'],
            publisher: 'DC Comics',
          },
        } as any,
      ]);

      vi.mocked(comicsService.searchComics).mockImplementation(async (query) => {
        if (query.toLowerCase().includes('batman')) {
          return [
            {
              id: 'cv-4050-3944',
              title: 'Batman: The Dark Knight Returns',
              type: 'comic',
              coverUrl: 'https://comicvine.gamespot.com/batman.jpg',
              releaseYear: 1986,
              creators: ['Frank Miller'],
              genres: ['Super-Heróis'],
            },
          ];
        }
        return [];
      });

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      expect(recs.length).toBeGreaterThan(0);
      const batmanRec = recs.find((r) => r.title.includes('Batman'));
      expect(batmanRec).toBeDefined();
      expect(batmanRec!.score).toBeGreaterThanOrEqual(95);
      expect(batmanRec!.reason).toContain('Batman: The Killing Joke');
    });

    it('recomenda mangás dinamicamente via grafo colaborativo da AniList para quem curtiu Berserk', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 2,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'al-30002',
          title: 'Berserk',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            genres: ['Dark Fantasy', 'Ação'],
          },
        } as any,
      ]);

      vi.mocked(comicsService.fetchMangaRecommendationsFromAniList).mockResolvedValueOnce([
        {
          id: 'al-30656',
          title: 'Vinland Saga',
          type: 'manga',
          coverUrl: 'https://s4.anilist.co/cover.jpg',
          releaseYear: 2005,
          creators: ['Makoto Yukimura'],
          genres: ['Ação', 'Histórico'],
        },
      ]);

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      const vinland = recs.find((r) => r.title === 'Vinland Saga');
      expect(vinland).toBeDefined();
      expect(vinland!.score).toBeGreaterThanOrEqual(96);
      expect(vinland!.reason).toContain('Berserk');
    });

    it('recomenda outras obras do mesmo autor dinamicamente', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 3,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'cv-4050-sandman',
          title: 'The Sandman',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            creators: ['Neil Gaiman'],
          },
        } as any,
      ]);

      vi.mocked(comicsService.searchComics).mockImplementation(async (query) => {
        if (query.toLowerCase().includes('neil gaiman')) {
          return [
            {
              id: 'cv-4050-coraline',
              title: 'Coraline: The Graphic Novel',
              type: 'comic',
              coverUrl: null,
              releaseYear: 2008,
              creators: ['Neil Gaiman', 'P. Craig Russell'],
              genres: ['Fantasia Sombria'],
            },
          ];
        }
        return [];
      });

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      const coraline = recs.find((r) => r.title.includes('Coraline'));
      expect(coraline).toBeDefined();
      expect(coraline!.reason).toContain('Neil Gaiman');
    });

    it('NUNCA recomenda itens com conteúdo adulto/NSFW ou termos eróticos (filtro de segurança estrito)', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'cv-4050-random',
          title: 'HQ Comum',
          userRating: 5,
          status: 'completed',
          extraMeta: { genres: ['Quadrinhos'] },
        } as any,
      ]);

      // Simula uma busca que retornaria item NSFW
      vi.mocked(comicsService.searchComics).mockResolvedValue([
        {
          id: 'cv-4050-junk-1',
          title: 'Planet Sex Quadrinhos',
          type: 'comic',
          coverUrl: null,
          releaseYear: 1999,
          creators: [],
          genres: ['Quadrinhos'],
        },
      ]);

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      expect(recs.some((r) => r.title.toLowerCase().includes('planet sex'))).toBe(false);
      expect(recs.some((r) => r.id === 'cv-4050-junk-1')).toBe(false);
    });

    it('não recomenda obras que o usuário já possui na sua estante', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'cv-4050-3944',
          title: 'Batman: The Dark Knight Returns',
          userRating: 5,
          status: 'completed',
          extraMeta: {},
        } as any,
      ]);

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      // O item já existente não deve ser recomendado novamente
      expect(recs.some((r) => r.id === 'cv-4050-3944')).toBe(false);
      expect(recs.some((r) => r.title === 'Batman: The Dark Knight Returns')).toBe(false);
    });

    it('busca e recomenda obras dinamicamente com base nas top tags do usuário via fetchMangaByGenresFromAniList', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 10,
          userId: mockUserId,
          domain: 'comic',
          externalId: 'al-30002',
          title: 'Berserk',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            genres: ['Dark Fantasy', 'Ação', 'Sobrenatural'],
          },
        } as any,
      ]);

      vi.mocked(comicsService.fetchMangaRecommendationsFromAniList).mockResolvedValue([]);
      vi.mocked(comicsService.searchComics).mockResolvedValue([]);
      vi.mocked(comicsService.fetchMangaByGenresFromAniList).mockResolvedValueOnce([
        {
          id: 'al-98436',
          title: 'Chainsaw Man',
          type: 'manga',
          coverUrl: 'https://s4.anilist.co/csm.jpg',
          releaseYear: 2018,
          creators: ['Tatsuki Fujimoto'],
          genres: ['Ação', 'Sobrenatural', 'Terror'],
        },
      ]);

      const recs = await getUserComicRecommendations(mockUserId, { limit: 5 });

      expect(comicsService.fetchMangaByGenresFromAniList).toHaveBeenCalled();
      const csm = recs.find((r) => r.id === 'al-98436');
      expect(csm).toBeDefined();
      expect(csm!.score).toBeGreaterThanOrEqual(84);
      expect(csm!.reason).toMatch(/afinidade.*(ação|sobrenatural)/i);
    });
  });

  describe('buildUserComicProfile (Content-Based Tag Profile)', () => {
    it('deve extrair e ponderar positivamente tags de obras 4★ e 5★', () => {
      const profile = buildUserComicProfile([
        {
          externalId: 'al-1',
          title: 'Manga Fantástico',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            genres: ['Dark Fantasy', 'Ação', 'hq'],
            publisher: 'Kodansha',
            creators: ['Autor Incrível'],
          },
        },
        {
          externalId: 'al-2',
          title: 'Manga Médio',
          userRating: 4,
          status: 'watching',
          extraMeta: {
            genres: ['Dark Fantasy', 'Mistério'],
          },
        },
      ]);

      expect(profile.positiveTags.length).toBeGreaterThan(0);
      // Dark Fantasy aparece nos dois: 5★ (completed = 4.5) + 4★ (watching = 2.4) = 6.9
      const darkFantasy = profile.positiveTags.find((t) => t.tag === 'dark fantasy');
      expect(darkFantasy).toBeDefined();
      expect(darkFantasy!.score).toBeCloseTo(6.9);

      // 'hq' deve ter sido ignorado
      expect(profile.tagScores.has('hq')).toBe(false);

      // Criadores e editoras devem estar mapeados
      expect(profile.favoriteCreators.get('autor incrível')).toBe(4.5);
      expect(profile.favoritePublishers.get('kodansha')).toBe(4.5);
    });

    it('deve identificar tags negativas de obras com 1★, 2★ ou status dropped', () => {
      const profile = buildUserComicProfile([
        {
          externalId: 'cv-dropped',
          title: 'Obra Ruim',
          userRating: 1,
          status: 'dropped',
          extraMeta: {
            genres: ['Romance Melodramático'],
          },
        },
      ]);

      expect(profile.negativeTags.has('romance melodramático')).toBe(true);
      expect(profile.positiveTags.length).toBe(0);
    });
  });

  describe('calculateComicAffinity (Dynamic % Match & Humanized Reason)', () => {
    const mockProfile = buildUserComicProfile([
      {
        externalId: 'seed-1',
        title: 'Obra Favorita',
        userRating: 5,
        status: 'completed',
        extraMeta: {
          genres: ['Cyberpunk', 'Ficção Científica'],
          publisher: 'Dark Horse',
          creators: ['Mestre Sci-Fi'],
        },
      },
      {
        externalId: 'bad-1',
        title: 'Detestei',
        userRating: 1,
        status: 'dropped',
        extraMeta: {
          genres: ['Comédia Pastelão'],
        },
      },
    ]);

    it('atribui alta probabilidade de afinidade (>= 88%) para candidato com tags favoritas', () => {
      const candidate = {
        id: 'al-akira',
        title: 'Akira',
        type: 'manga' as const,
        genres: ['Cyberpunk', 'Ficção Científica'],
        creators: ['Katsuhiro Otomo'],
      };

      const result = calculateComicAffinity(candidate, mockProfile, {
        matchType: 'tag',
      });

      expect(result.score).toBeGreaterThanOrEqual(88);
      expect(result.reason).toContain('afinidade');
      expect(result.reason).toMatch(/cyberpunk|ficção científica/i);
    });

    it('penaliza severamente o score de obras que possuem tags do conjunto negativo', () => {
      const candidateBad = {
        id: 'cv-bad',
        title: 'História com Pastelão',
        type: 'comic' as const,
        genres: ['Comédia Pastelão'],
        creators: [],
      };

      const result = calculateComicAffinity(candidateBad, mockProfile);
      expect(result.score).toBeLessThanOrEqual(70);
    });

    it('aplica bônus de criador e editora compartilhados', () => {
      const candidateWithCreator = {
        id: 'cv-fav',
        title: 'Nova Obra do Mestre',
        type: 'comic' as const,
        genres: ['Aventura'],
        creators: ['Mestre Sci-Fi'],
        publisher: 'Dark Horse',
      };

      const result = calculateComicAffinity(candidateWithCreator, mockProfile, {
        seedTitle: 'Obra Favorita',
        matchType: 'creator',
      });

      expect(result.score).toBeGreaterThanOrEqual(84);
      expect(result.reason).toContain('Mestre Sci-Fi');
    });
  });
});

