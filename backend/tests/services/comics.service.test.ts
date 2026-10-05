import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchComics,
  getComicDetails,
  fetchPopularComics,
  searchMangaFromAniList,
  searchComicsFromComicVine,
  _clearComicsCacheForTesting,
  POPULAR_COMICS_CATALOG,
} from '../../src/services/comics.service.js';

describe('Comics Service (AniList GraphQL & Comic Vine REST)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    _clearComicsCacheForTesting();
    process.env.COMICVINE_API_KEY = 'test-comicvine-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Popular Comics (Cold Start & Catálogo Consagrado)', () => {
    it('deve retornar a lista de sagas e mangás populares', async () => {
      const popular = await fetchPopularComics(5);
      expect(popular).toHaveLength(5);
      expect(popular[0]).toHaveProperty('title');
      expect(popular[0]).toHaveProperty('type');
      expect(popular[0]).toHaveProperty('genres');
    });

    it('deve conter Watchmen e Berserk no catálogo', () => {
      const titles = POPULAR_COMICS_CATALOG.map((c) => c.title);
      expect(titles).toContain('Watchmen');
      expect(titles).toContain('Berserk');
      expect(titles).toContain('Batman: The Long Halloween');
    });
  });

  describe('AniList GraphQL Ingestion', () => {
    it('deve converter corretamente a resposta da AniList em ComicDetails', async () => {
      const mockAniListResponse = {
        data: {
          Page: {
            media: [
              {
                id: 30002,
                title: { english: 'Berserk', romaji: 'Berserk', native: 'ベルセルク' },
                description: 'A dark fantasy tale.',
                coverImage: {
                  extraLarge: 'http://example.com/cover.jpg',
                },
                startDate: { year: 1989 },
                countryOfOrigin: 'JP',
                format: 'MANGA',
                status: 'RELEASING',
                volumes: 42,
                chapters: 376,
                genres: ['Action', 'Fantasy'],
                staff: {
                  nodes: [{ name: { full: 'Kentaro Miura' } }],
                },
              },
            ],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAniListResponse,
      } as unknown as Response);

      const results = await searchMangaFromAniList('Berserk', 1);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('al-30002');
      expect(results[0].title).toBe('Berserk');
      expect(results[0].type).toBe('manga');
      expect(results[0].coverUrl).toBe('https://example.com/cover.jpg');
      expect(results[0].volumeCount).toBe(42);
      expect(results[0].chapterCount).toBe(376);
      expect(results[0].creators).toEqual(['Kentaro Miura']);
      expect(results[0].issues).toBeDefined();
      expect(results[0].issues?.length).toBe(42);
      expect(results[0].issues?.[0].name).toBe('Berserk - Volume 1');
    });

    it('deve identificar Manhwa quando a origem for Coreia do Sul (KR)', async () => {
      const mockManhwaResponse = {
        data: {
          Page: {
            media: [
              {
                id: 105398,
                title: { english: 'Solo Leveling' },
                countryOfOrigin: 'KR',
                format: 'MANHWA',
                volumes: 14,
              },
            ],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockManhwaResponse,
      } as unknown as Response);

      const results = await searchMangaFromAniList('Solo Leveling', 1);
      expect(results[0].type).toBe('manhwa');
    });
  });

  describe('Comic Vine Volumes Ingestion', () => {
    it('deve processar volumes e sagas retornados pela Comic Vine API', async () => {
      const mockComicVineResponse = {
        status_code: 1,
        results: [
          {
            id: 3622,
            name: 'Watchmen',
            deck: 'Seminal comic series by Alan Moore',
            start_year: '1986',
            count_of_issues: 12,
            publisher: { id: 10, name: 'DC Comics' },
            image: {
              medium_url: 'http://example.com/watchmen.jpg',
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockComicVineResponse,
      } as unknown as Response);

      const results = await searchComicsFromComicVine('Watchmen', 1);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('cv-4050-3622');
      expect(results[0].title).toBe('Watchmen');
      expect(results[0].type).toBe('comic');
      expect(results[0].publisher).toBe('DC Comics');
      expect(results[0].releaseYear).toBe(1986);
      expect(results[0].issueCount).toBe(12);
      expect(results[0].coverUrl).toBe('https://example.com/watchmen.jpg');
    });
  });

  describe('getComicDetails & Issues checklist enumeration', () => {
    it('deve retornar detalhes e checklist de edições para Watchmen', async () => {
      const details = await getComicDetails('cv-4050-53871');
      expect(details).not.toBeNull();
      expect(details?.title).toBe('Watchmen');
      expect(details?.issues).toBeDefined();
      expect(details?.issues?.length).toBe(12);
      expect(details?.issues?.[0].issueNumber).toBe('1');
    });

    it('deve retornar detalhes e lista de volumes para Berserk', async () => {
      const details = await getComicDetails('al-30002');
      expect(details).not.toBeNull();
      expect(details?.title).toBe('Berserk');
      expect(details?.volumeCount).toBe(42);
    });
  });

  describe('searchComics unificado', () => {
    it('deve encontrar títulos correspondentes no catálogo pré-configurado', async () => {
      const results = await searchComics('Civil War', 'all', 5);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.title.includes('Civil War'))).toBe(true);
    });
  });
});
