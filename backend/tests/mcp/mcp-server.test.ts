import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AKASHA_MCP_TOOLS,
  executeAkashaMcpTool,
} from '../../src/mcp/mcp-server.js';
import { prisma } from '../../src/lib/prisma.js';
import * as igdbService from '../../src/services/igdb.service.js';
import * as booksService from '../../src/services/books.service.js';
import * as comicsService from '../../src/services/comics.service.js';
import * as tmdbService from '../../src/services/tmdb.service.js';
import * as transmediaService from '../../src/services/transmedia.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/igdb.service.js', () => ({
  searchGames: vi.fn(),
}));

vi.mock('../../src/services/books.service.js', () => ({
  searchBooks: vi.fn(),
}));

vi.mock('../../src/services/comics.service.js', () => ({
  searchComics: vi.fn(),
}));

vi.mock('../../src/services/tmdb.service.js', () => ({
  searchMedia: vi.fn(),
}));

vi.mock('../../src/services/transmedia.service.js', () => ({
  getUserTransmediaRecommendations: vi.fn(),
  getUserArchiveStats: vi.fn(),
  CANONICAL_FRANCHISES: [{ name: 'The Witcher' }],
}));

vi.mock('../../src/services/recommendation.service.js', () => ({
  getUserRecommendations: vi.fn(),
}));

vi.mock('../../src/services/game-recommendation.service.js', () => ({
  getUserGameRecommendations: vi.fn(),
}));

vi.mock('../../src/services/book-recommendation.service.js', () => ({
  getUserBookRecommendations: vi.fn(),
}));

vi.mock('../../src/services/comic-recommendation.service.js', () => ({
  getUserComicRecommendations: vi.fn(),
}));

describe('Akasha MCP Server - Universal Domain Tools', () => {
  const mockUserId = 'usr-mcp-uuid-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AKASHA_MCP_TOOLS schema definition', () => {
    it('deve conter as ferramentas universais com suporte a domain', () => {
      const toolNames = AKASHA_MCP_TOOLS.map((t) => t.name);
      expect(toolNames).toContain('search_media');
      expect(toolNames).toContain('get_recommendations');
      expect(toolNames).toContain('add_to_library');
      expect(toolNames).toContain('rate_media');
      expect(toolNames).toContain('remove_from_list');
      expect(toolNames).toContain('get_library_stats');
      expect(toolNames).toContain('get_transmedia_connections');

      const searchTool = AKASHA_MCP_TOOLS.find((t) => t.name === 'search_media');
      expect(searchTool?.inputSchema.properties.domain).toBeDefined();
    });
  });

  describe('executeAkashaMcpTool execution', () => {
    it('search_media no domínio "game" deve despachar para searchGames', async () => {
      vi.mocked(igdbService.searchGames).mockResolvedValueOnce([
        { id: '1942', title: 'The Witcher 3' },
      ] as any);

      const res = (await executeAkashaMcpTool(
        'search_media',
        { query: 'witcher', domain: 'game', limit: 5 },
        mockUserId
      )) as any;

      expect(res.domain).toBe('game');
      expect(res.count).toBe(1);
      expect(igdbService.searchGames).toHaveBeenCalledWith('witcher', 5);
    });

    it('search_media no domínio "book" deve despachar para searchBooks', async () => {
      vi.mocked(booksService.searchBooks).mockResolvedValueOnce([
        { id: 'b1', title: 'Duna' },
      ] as any);

      const res = (await executeAkashaMcpTool(
        'search_media',
        { query: 'duna', domain: 'book' },
        mockUserId
      )) as any;

      expect(res.domain).toBe('book');
      expect(booksService.searchBooks).toHaveBeenCalledWith('duna', 10);
    });

    it('get_recommendations no domínio "transmedia" deve chamar getUserTransmediaRecommendations', async () => {
      vi.mocked(transmediaService.getUserTransmediaRecommendations).mockResolvedValueOnce([
        { franchiseName: 'The Witcher', score: 95 } as any,
      ]);

      const res = (await executeAkashaMcpTool(
        'get_recommendations',
        { domain: 'transmedia', limit: 5 },
        mockUserId
      )) as any;

      expect(res.domain).toBe('transmedia');
      expect(res.recommendations).toHaveLength(1);
      expect(transmediaService.getUserTransmediaRecommendations).toHaveBeenCalledWith(mockUserId, 5);
    });

    it('add_to_library deve realizar upsert no modelo Wishlist no domínio fornecido', async () => {
      vi.mocked(prisma.wishlist.upsert).mockResolvedValueOnce({
        id: 99,
        userId: mockUserId,
        domain: 'comic',
        externalId: 'cv-batman-1',
        title: 'Batman Ano Um',
        status: 'plan_to_watch',
      } as any);

      const res = (await executeAkashaMcpTool(
        'add_to_library',
        {
          externalId: 'cv-batman-1',
          domain: 'comic',
          title: 'Batman Ano Um',
          status: 'plan_to_watch',
        },
        mockUserId
      )) as any;

      expect(res.wishlist.id).toBe(99);
      expect(prisma.wishlist.upsert).toHaveBeenCalled();
    });

    it('rate_media deve validar range de 1 a 5 estrelas e atualizar Wishlist', async () => {
      vi.mocked(prisma.wishlist.upsert).mockResolvedValueOnce({
        id: 88,
        userRating: 5,
        status: 'completed',
      } as any);

      const res = (await executeAkashaMcpTool(
        'rate_media',
        { externalId: '1942', domain: 'game', rating: 5 },
        mockUserId
      )) as any;

      expect(res.message).toContain('5★');

      await expect(
        executeAkashaMcpTool('rate_media', { externalId: '1942', domain: 'game', rating: 6 }, mockUserId)
      ).rejects.toThrow('A avaliação deve ser entre 1 e 5 estrelas.');
    });

    it('get_library_stats deve chamar getUserArchiveStats', async () => {
      vi.mocked(transmediaService.getUserArchiveStats).mockResolvedValueOnce({
        totalItems: 42,
        diversityIndex: { score: 95, archetypeTitle: 'Polímata Transmídia' },
      } as any);

      const res = (await executeAkashaMcpTool('get_library_stats', {}, mockUserId)) as any;
      expect(res.totalItems).toBe(42);
      expect(res.diversityIndex.archetypeTitle).toBe('Polímata Transmídia');
      expect(transmediaService.getUserArchiveStats).toHaveBeenCalledWith(mockUserId);
    });

    it('get_transmedia_connections deve retornar conexões transmídia e franquias disponíveis', async () => {
      vi.mocked(transmediaService.getUserTransmediaRecommendations).mockResolvedValueOnce([
        { franchiseName: 'The Witcher' } as any,
      ]);

      const res = (await executeAkashaMcpTool(
        'get_transmedia_connections',
        { limit: 4 },
        mockUserId
      )) as any;

      expect(res.totalFound).toBe(1);
      expect(res.availableFranchises).toContain('The Witcher');
    });
  });
});
