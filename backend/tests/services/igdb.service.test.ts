import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchGames,
  fetchGameDetails,
  fetchSimilarGames,
  fetchPopularGames,
  fetchTwitchTrendingGames,
  _clearTwitchTokenCacheForTesting,
} from '../../src/services/igdb.service.js';

describe('IGDB Service: Proteção de Produção, Zero Mocks e Tendências da Twitch', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    _clearTwitchTokenCacheForTesting();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  describe('Em ambiente de Produção (NODE_ENV === "production")', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.TWITCH_CLIENT_ID;
      delete process.env.TWITCH_CLIENT_SECRET;
      delete process.env.IGDB_CLIENT_ID;
      delete process.env.IGDB_CLIENT_SECRET;
    });

    it('searchGames NUNCA deve retornar itens mockados em produção quando a API falhar ou não houver credenciais', async () => {
      const results = await searchGames('witcher', 10);
      expect(results).toEqual([]);
    });

    it('fetchGameDetails NUNCA deve retornar itens mockados em produção mesmo para IDs arbitrários', async () => {
      const details = await fetchGameDetails('1024');
      expect(details).toBeNull();
    });

    it('fetchSimilarGames NUNCA deve retornar itens mockados em produção', async () => {
      const similar = await fetchSimilarGames('1024', 6);
      expect(similar).toEqual([]);
    });

    it('fetchPopularGames NUNCA deve retornar itens mockados em produção', async () => {
      const popular = await fetchPopularGames(10);
      expect(popular).toEqual([]);
    });

    it('searchGames deve retornar lista vazia se a chamada HTTP à IGDB falhar com 500 em produção', async () => {
      process.env.TWITCH_CLIENT_ID = 'fake-client-id';
      process.env.TWITCH_CLIENT_SECRET = 'fake-secret';

      // Mock da Twitch respondendo token ok e da IGDB falhando com 500
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'fake-token', expires_in: 3600 }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
        );

      const results = await searchGames('zelda', 5);
      expect(results).toEqual([]);
    });
  });

  describe('Tendências da Twitch Helix API (fetchTwitchTrendingGames)', () => {
    it('deve buscar jogos do Twitch Helix /helix/games/top, filtrar categorias não-jogo e enriquecer via IGDB v4 na ordem exata', async () => {
      process.env.NODE_ENV = 'development';
      process.env.TWITCH_CLIENT_ID = 'valid-twitch-client';
      process.env.TWITCH_CLIENT_SECRET = 'valid-twitch-secret';

      const mockTwitchToken = { access_token: 'mock-twitch-token', expires_in: 3600 };
      const mockTwitchTopResponse = {
        data: [
          { id: '509658', name: 'Just Chatting', box_art_url: 'https://ttv/just-chatting-{width}x{height}.jpg', igdb_id: '' },
          { id: '32982', name: 'Grand Theft Auto V', box_art_url: 'https://ttv/gtav-{width}x{height}.jpg', igdb_id: '1020' },
          { id: '509672', name: 'IRL', box_art_url: 'https://ttv/irl-{width}x{height}.jpg', igdb_id: '' },
          { id: '21779', name: 'League of Legends', box_art_url: 'https://ttv/lol-{width}x{height}.jpg', igdb_id: '115' },
        ],
      };

      const mockIgdbResponse = [
        {
          id: 115,
          name: 'League of Legends',
          slug: 'league-of-legends',
          summary: 'MOBA competitivo 5v5.',
          cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/lol.jpg' },
          first_release_date: 1256601600,
          genres: [{ name: 'MOBA' }, { name: 'Estratégia' }],
          platforms: [{ name: 'PC' }],
          total_rating: 88,
          similar_games: [29595],
        },
        {
          id: 1020,
          name: 'Grand Theft Auto V',
          slug: 'grand-theft-auto-v',
          summary: 'Ação e mundo aberto em Los Santos.',
          cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/gtav.jpg' },
          first_release_date: 1379376000,
          genres: [{ name: 'Ação' }, { name: 'Mundo Aberto' }],
          platforms: [{ name: 'PC' }, { name: 'PS5' }],
          total_rating: 96,
          similar_games: [1030],
        },
      ];

      globalThis.fetch = vi
        .fn()
        // 1. Token Twitch
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTwitchToken), { status: 200 }))
        // 2. Twitch Helix Games Top
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTwitchTopResponse), { status: 200 }))
        // 3. IGDB v4 Batch Query
        .mockResolvedValueOnce(new Response(JSON.stringify(mockIgdbResponse), { status: 200 }));

      const trending = await fetchTwitchTrendingGames(5);

      // Deve ter filtrado 'Just Chatting' e 'IRL', mantendo apenas GTA V (#1) e LoL (#2) na ordem da Twitch
      expect(trending).toHaveLength(2);
      expect(trending[0].id).toBe('1020');
      expect(trending[0].title).toBe('Grand Theft Auto V');
      expect(trending[0].coverUrl).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/gtav.jpg');
      expect(trending[0].genres).toEqual(['Ação', 'Mundo Aberto']);

      expect(trending[1].id).toBe('115');
      expect(trending[1].title).toBe('League of Legends');
      expect(trending[1].genres).toEqual(['MOBA', 'Estratégia']);
    });

    it('fetchPopularGames deve delegar diretamente para fetchTwitchTrendingGames', async () => {
      process.env.NODE_ENV = 'development';
      process.env.TWITCH_CLIENT_ID = 'valid-twitch-client';
      process.env.TWITCH_CLIENT_SECRET = 'valid-twitch-secret';

      const mockTwitchToken = { access_token: 'mock-twitch-token', expires_in: 3600 };
      const mockTwitchTopResponse = {
        data: [
          { id: '126459', name: 'VALORANT', box_art_url: 'https://ttv/valorant-{width}x{height}.jpg', igdb_id: '126459' },
        ],
      };
      const mockIgdbResponse = [
        {
          id: 126459,
          name: 'Valorant',
          slug: 'valorant',
          summary: 'FPS tático 5v5.',
          cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/val.jpg' },
          genres: [{ name: 'Shooter' }],
          platforms: [{ name: 'PC' }],
          total_rating: 85,
        },
      ];

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTwitchToken), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTwitchTopResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockIgdbResponse), { status: 200 }));

      const popular = await fetchPopularGames(1);
      expect(popular).toHaveLength(1);
      expect(popular[0].title).toBe('Valorant');
    });

    it('searchGames com query vazia deve retornar tendências da Twitch', async () => {
      process.env.NODE_ENV = 'development';
      process.env.TWITCH_CLIENT_ID = 'valid-twitch-client';
      process.env.TWITCH_CLIENT_SECRET = 'valid-twitch-secret';

      const mockTwitchToken = { access_token: 'mock-twitch-token', expires_in: 3600 };
      const mockTwitchTopResponse = {
        data: [
          { id: '18122', name: 'World of Warcraft', box_art_url: 'https://ttv/wow-{width}x{height}.jpg', igdb_id: '123' },
        ],
      };
      const mockIgdbResponse = [
        {
          id: 123,
          name: 'World of Warcraft',
          slug: 'world-of-warcraft',
          summary: 'MMORPG clássico.',
          cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/wow.jpg' },
          genres: [{ name: 'RPG' }],
          platforms: [{ name: 'PC' }],
          total_rating: 91,
        },
      ];

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTwitchToken), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockTwitchTopResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockIgdbResponse), { status: 200 }));

      const results = await searchGames('   ', 1);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('World of Warcraft');
    });
  });

  describe('Normalização de dados reais da IGDB', () => {
    it('deve normalizar corretamente a resposta oficial da IGDB quando a API estiver ativa', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TWITCH_CLIENT_ID = 'valid-client';
      process.env.TWITCH_CLIENT_SECRET = 'valid-secret';

      const mockIgdbGame = [
        {
          id: 9999,
          name: 'Super Metroid',
          slug: 'super-metroid',
          summary: 'Aventuras de Samus Aran em Zebes.',
          cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co1234.jpg' },
          screenshots: [{ url: '//images.igdb.com/igdb/image/upload/t_thumb/sc1234.jpg' }],
          first_release_date: 764121600, // 1994
          genres: [{ name: 'Ação' }, { name: 'Aventura' }],
          platforms: [{ name: 'SNES' }],
          total_rating: 96.4,
          similar_games: [8888, 7777],
        },
      ];

      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'valid-token', expires_in: 3600 }), {
            status: 200,
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockIgdbGame), { status: 200 })
        );

      const results = await searchGames('Metroid', 1);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: '9999',
        title: 'Super Metroid',
        slug: 'super-metroid',
        summary: 'Aventuras de Samus Aran em Zebes.',
        coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1234.jpg',
        backdropUrl: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc1234.jpg',
        releaseYear: 1994,
        genres: ['Ação', 'Aventura'],
        platforms: ['SNES'],
        rating: 96,
        similarGameIds: ['8888', '7777'],
      });
    });
  });
});
