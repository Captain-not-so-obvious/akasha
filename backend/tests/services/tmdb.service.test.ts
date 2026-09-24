import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMediaDetails, searchMedia } from '../../src/services/tmdb.service.js';

describe('tmdb.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, TMDB_READ_ACCESS_TOKEN: 'fake-jwt-token' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('fetchMediaDetails', () => {
    it('deve normalizar detalhes e incluir watchProviders quando o nó watch/providers contiver a região BR', async () => {
      const mockTmdbResponse = {
        id: 550,
        title: 'Fight Club',
        overview: 'Um homem insatisfeito...',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        release_date: '1999-10-15',
        vote_average: 8.4,
        genres: [{ id: 18, name: 'Drama' }],
        'watch/providers': {
          results: {
            BR: {
              link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=BR',
              flatrate: [
                {
                  provider_id: 8,
                  provider_name: 'Netflix',
                  logo_path: '/netflix.png',
                },
                {
                  provider_id: 119,
                  provider_name: 'Amazon Prime Video',
                  logo_path: '/prime.png',
                },
              ],
              rent: [
                {
                  provider_id: 2,
                  provider_name: 'Apple TV',
                  logo_path: '/appletv.png',
                },
              ],
              buy: [],
            },
            US: {
              flatrate: [],
            },
          },
        },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTmdbResponse,
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchMediaDetails(550, 'movie');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.themoviedb.org/3/movie/550?language=pt-BR&append_to_response=watch/providers',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-jwt-token',
          }),
        })
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(550);
      expect(result?.title).toBe('Fight Club');
      expect(result?.watchProviders).toEqual({
        link: 'https://www.themoviedb.org/movie/550-fight-club/watch?locale=BR',
        flatrate: [
          {
            id: 8,
            name: 'Netflix',
            logoUrl: 'https://image.tmdb.org/t/p/w185/netflix.png',
          },
          {
            id: 119,
            name: 'Amazon Prime Video',
            logoUrl: 'https://image.tmdb.org/t/p/w185/prime.png',
          },
        ],
        rent: [
          {
            id: 2,
            name: 'Apple TV',
            logoUrl: 'https://image.tmdb.org/t/p/w185/appletv.png',
          },
        ],
        buy: [],
      });
    });

    it('deve retornar watchProviders como null se a região BR não estiver presente', async () => {
      const mockTmdbResponse = {
        id: 123,
        name: 'Série Rara',
        overview: 'Sem provedores no Brasil',
        first_air_date: '2022-01-01',
        'watch/providers': {
          results: {
            US: {
              flatrate: [{ provider_id: 999, provider_name: 'Hulu', logo_path: '/hulu.png' }],
            },
          },
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockTmdbResponse,
        })
      );

      const result = await fetchMediaDetails(123, 'tv');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Série Rara');
      expect(result?.mediaType).toBe('tv');
      expect(result?.watchProviders).toBeNull();
    });

    it('deve retornar null graciosamente quando a requisição ao TMDB falhar', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        })
      );

      const result = await fetchMediaDetails(999999, 'movie');
      expect(result).toBeNull();
    });
  });

  describe('searchMedia', () => {
    it('deve buscar e normalizar itens de busca do TMDB', async () => {
      const mockSearchResponse = {
        results: [
          {
            id: 10,
            title: 'Star Wars',
            overview: 'Uma galáxia muito distante...',
            poster_path: '/sw.jpg',
            backdrop_path: '/sw-bg.jpg',
            release_date: '1977-05-25',
            vote_average: 8.6,
          },
        ],
        total_results: 1,
        total_pages: 1,
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockSearchResponse,
        })
      );

      const result = await searchMedia('Star Wars', 'movie', 1);

      expect(result).not.toBeNull();
      expect(result?.totalResults).toBe(1);
      expect(result?.results[0].title).toBe('Star Wars');
      expect(result?.results[0].watchProviders).toBeNull();
    });
  });
});
