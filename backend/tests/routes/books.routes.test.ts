import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { booksRoutes } from '../../src/routes/books.routes.js';
import * as booksService from '../../src/services/books.service.js';
import * as bookRecService from '../../src/services/book-recommendation.service.js';

vi.mock('../../src/services/books.service.js', () => ({
  searchBooks: vi.fn(),
  fetchBookDetails: vi.fn(),
  fetchPopularBooks: vi.fn(),
}));

vi.mock('../../src/services/book-recommendation.service.js', () => ({
  getUserBookRecommendations: vi.fn(),
}));

// Mock do middleware de autenticação
vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  authMiddleware: vi.fn(async (request) => {
    request.userId = 'user-books-123';
  }),
}));

describe('Integration: Books Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(booksRoutes, { prefix: '/books' });
    vi.clearAllMocks();
  });

  describe('GET /books/search', () => {
    it('deve retornar resultados da busca com sucesso', async () => {
      const mockResults = [
        { id: 'vol-dom', title: 'Dom Casmurro', releaseYear: 1899 },
      ];
      vi.mocked(booksService.searchBooks).mockResolvedValue(mockResults as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/books/search?q=casmurro',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ results: mockResults });
      expect(booksService.searchBooks).toHaveBeenCalledWith('casmurro', 12);
    });

    it('deve retornar 400 se o parâmetro "q" for omitido', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/books/search',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('error', 'Parâmetros de busca inválidos.');
    });
  });

  describe('GET /books/popular', () => {
    it('deve retornar a lista de livros populares', async () => {
      const mockPopular = [
        { id: 'vol-pop', title: 'Grande Sertão: Veredas' },
      ];
      vi.mocked(booksService.fetchPopularBooks).mockResolvedValue(mockPopular as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/books/popular?limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ results: mockPopular });
      expect(booksService.fetchPopularBooks).toHaveBeenCalledWith(5);
    });
  });

  describe('GET /books/recommendations', () => {
    it('deve retornar recomendações personalizadas para o usuário autenticado', async () => {
      const mockRecs = [
        { id: 'vol-rec', title: 'Memórias Póstumas', score: 9.0, reason: 'Porque você leu Dom Casmurro' },
      ];
      vi.mocked(bookRecService.getUserBookRecommendations).mockResolvedValue(mockRecs as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/books/recommendations?limit=6',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ recommendations: mockRecs });
      expect(bookRecService.getUserBookRecommendations).toHaveBeenCalledWith('user-books-123', { limit: 6 });
    });
  });

  describe('GET /books/:id', () => {
    it('deve retornar detalhes de um livro existente', async () => {
      const mockBook = { id: 'vol-dom', title: 'Dom Casmurro', authors: ['Machado de Assis'] };
      vi.mocked(booksService.fetchBookDetails).mockResolvedValue(mockBook as any);

      const response = await fastify.inject({
        method: 'GET',
        url: '/books/vol-dom',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual(mockBook);
      expect(booksService.fetchBookDetails).toHaveBeenCalledWith('vol-dom');
    });

    it('deve retornar 404 quando o livro não for encontrado', async () => {
      vi.mocked(booksService.fetchBookDetails).mockResolvedValue(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/books/vol-inexistente',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'Livro não encontrado.' });
    });
  });
});
