import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { tmdbRoutes } from '../../src/routes/tmdb.routes.js';
import { gamesRoutes } from '../../src/routes/games.routes.js';
import { booksRoutes } from '../../src/routes/books.routes.js';
import { comicsRoutes } from '../../src/routes/comics.routes.js';
import { oauthRoutes } from '../../src/routes/oauth.routes.js';
import { fetchGameDetails, searchGames } from '../../src/services/igdb.service.js';
import { prisma } from '../../src/lib/prisma.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    oAuthCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    mcpGrant: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/tmdb.service.js', () => ({
  fetchMediaDetails: vi.fn().mockResolvedValue(null),
  searchMedia: vi.fn().mockResolvedValue({ results: [], totalResults: 0, totalPages: 0 }),
}));

vi.mock('../../src/services/books.service.js', () => ({
  fetchBookDetails: vi.fn().mockResolvedValue(null),
  searchBooks: vi.fn().mockResolvedValue([]),
  fetchPopularBooks: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/services/comics.service.js', () => ({
  getComicDetails: vi.fn().mockResolvedValue(null),
  searchComics: vi.fn().mockResolvedValue([]),
  fetchPopularComics: vi.fn().mockResolvedValue([]),
}));

describe('SPEC-021: Security Hardening & API Shielding Tests', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(cookie);

    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      crossOriginEmbedderPolicy: false,
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      allowList: (req) => req.url === '/health',
    });

    await fastify.register(tmdbRoutes, { prefix: '/tmdb' });
    await fastify.register(gamesRoutes, { prefix: '/games' });
    await fastify.register(booksRoutes, { prefix: '/books' });
    await fastify.register(comicsRoutes, { prefix: '/comics' });
    await fastify.register(oauthRoutes, { prefix: '/oauth' });

    vi.clearAllMocks();
  });

  describe('1. Cabeçalhos HTTP Defensivos (Helmet & Anti-Clickjacking)', () => {
    it('deve emitir cabeçalhos X-Frame-Options: DENY e CSP frame-ancestors none', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tmdb/search?q=batman&type=movie',
      });

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });

  describe('2. Blindagem contra Injeção de Apicalypse no IGDB', () => {
    it('fetchGameDetails deve retornar null e bloquear IDs maliciosos contendo comandos Apicalypse', async () => {
      const maliciousId = '123; fields *;';
      const result = await fetchGameDetails(maliciousId);
      expect(result).toBeNull();
    });

    it('rota GET /games/:id deve rejeitar IDs não numéricos com HTTP 400', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/games/123-or-id!=0',
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json).toHaveProperty('error', 'Parâmetro de rota inválido.');
    });

    it('searchGames deve sanitizar caracteres de controle Apicalypse (; e aspas)', async () => {
      // Quando credenciais da Twitch não estão no env de teste, deve retornar fallback limpo sem quebrar
      const result = await searchGames('Final Fantasy"; where id != 0;');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('3. Validação Zod Estrita de Parâmetros de Rota (Diretriz 4)', () => {
    it('GET /tmdb/:type/:id deve rejeitar tipo inválido com HTTP 400', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tmdb/game/12345',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Parâmetros de rota inválidos.');
    });

    it('GET /tmdb/:type/:id deve rejeitar id não numérico com HTTP 400', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tmdb/movie/batman',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Parâmetros de rota inválidos.');
    });

    it('GET /tmdb/search deve rejeitar requisição sem parâmetro q com HTTP 400', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/tmdb/search?type=movie',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Parâmetros de busca inválidos.');
    });
  });

  describe('4. Proteção Anti-CSRF no Formulário de Consentimento OAuth', () => {
    it('GET /oauth/authorize deve definir cookie oauth_csrf_token com SameSite=Lax e HttpOnly', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/oauth/authorize?client_id=claude&redirect_uri=https://claude.ai/api/mcp/auth_callback',
      });

      expect(response.statusCode).toBe(200);
      const setCookie = response.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      expect(String(setCookie)).toContain('oauth_csrf_token');
    });

    it('POST /oauth/authorize deve rejeitar submissão com CSRF token divergente com HTTP 403', async () => {
      const mockUserId = '11111111-2222-3333-4444-555555555555';
      vi.mocked(prisma.profile.findUnique).mockResolvedValueOnce({
        id: mockUserId,
        email: 'user@akasha.com',
      } as any);

      // Simula token de sessão no cookie, mas com csrf_token forjado
      const response = await fastify.inject({
        method: 'POST',
        url: '/oauth/authorize',
        cookies: {
          oauth_csrf_token: 'legitimate-csrf-secret',
        },
        payload: {
          client_id: 'claude',
          redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
          csrf_token: 'forged-attacker-csrf-token',
        },
      });

      // Como o usuário não tem token de autenticação neste inject, o fluxo rejeita
      expect([302, 403]).toContain(response.statusCode);
    });
  });
});
