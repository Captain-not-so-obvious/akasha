import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateBookWeight,
  getUserBookRecommendations,
} from '../../src/services/book-recommendation.service.js';
import { prisma } from '../../src/lib/prisma.js';
import * as booksService from '../../src/services/books.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/books.service.js', () => ({
  searchBooksByAuthor: vi.fn(),
  searchBooksBySubject: vi.fn(),
  fetchPopularBooks: vi.fn(),
}));

describe('Book Recommendation Service - Unit Tests', () => {
  const mockUserId = 'user-books-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateBookWeight', () => {
    it('deve atribuir peso fortemente negativo (-3.0) para status dropped', () => {
      const weight = calculateBookWeight({
        externalId: 'vol-drop',
        title: 'Livro Abandonado',
        userRating: 5,
        status: 'dropped',
      });
      expect(weight).toBe(-3.0);
    });

    it('deve calcular corretamente peso positivo com multiplicador de status completed (1.5x)', () => {
      const weight = calculateBookWeight({
        externalId: 'vol-dom-casmurro',
        title: 'Dom Casmurro',
        userRating: 5,
        status: 'completed',
      });
      // 3.0 * 1.5 = 4.5
      expect(weight).toBe(4.5);
    });

    it('deve calcular corretamente peso com status watching (1.2x)', () => {
      const weight = calculateBookWeight({
        externalId: 'vol-duna',
        title: 'Duna',
        userRating: 4,
        status: 'watching',
      });
      // 2.0 * 1.2 = 2.4
      expect(weight).toBeCloseTo(2.4);
    });

    it('deve calcular peso negativo para avaliações baixas (1 ou 2 estrelas)', () => {
      const weight2 = calculateBookWeight({
        externalId: 'vol-ruim',
        title: 'Livro Fraco',
        userRating: 2,
        status: 'completed',
      });
      // -1.0 * 1.5 = -1.5
      expect(weight2).toBe(-1.5);

      const weight1 = calculateBookWeight({
        externalId: 'vol-pessimo',
        title: 'Livro Péssimo',
        userRating: 1,
        status: 'plan_to_watch',
      });
      // -2.0 * 1.0 = -2.0
      expect(weight1).toBe(-2.0);
    });
  });

  describe('getUserBookRecommendations', () => {
    it('deve disparar Cold Start com livros clássicos/populares quando o usuário não tiver livros', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([]);
      vi.mocked(booksService.fetchPopularBooks).mockResolvedValue([
        {
          id: 'pop-1',
          title: 'Grande Sertão: Veredas',
          authors: ['João Guimarães Rosa'],
          coverUrl: '/cover.jpg',
          releaseYear: 1956,
          categories: ['Fiction'],
          pageCount: 600,
        },
      ]);

      const recs = await getUserBookRecommendations(mockUserId, { limit: 5 });

      expect(recs).toHaveLength(1);
      expect(recs[0].id).toBe('pop-1');
      expect(recs[0].title).toBe('Grande Sertão: Veredas');
      expect(recs[0].reason).toContain('Clássico da literatura recomendado');
    });

    it('deve recomendar obras do mesmo autor quando o usuário tiver livro bem avaliado', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'book',
          externalId: 'vol-dom-casmurro',
          title: 'Dom Casmurro',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            authors: ['Machado de Assis'],
            categories: ['Fiction'],
          },
        } as any,
      ]);

      vi.mocked(booksService.searchBooksByAuthor).mockResolvedValue([
        {
          id: 'vol-bras-cubas',
          title: 'Memórias Póstumas de Brás Cubas',
          authors: ['Machado de Assis'],
          coverUrl: '/bras.jpg',
          releaseYear: 1881,
          categories: ['Fiction'],
          pageCount: 200,
        },
      ]);
      vi.mocked(booksService.searchBooksBySubject).mockResolvedValue([]);
      vi.mocked(booksService.fetchPopularBooks).mockResolvedValue([]);

      const recs = await getUserBookRecommendations(mockUserId, { limit: 5 });

      expect(recs).toHaveLength(1);
      expect(recs[0].id).toBe('vol-bras-cubas');
      expect(recs[0].reason).toContain('Porque você apreciou obras de Machado de Assis');
    });

    it('não deve recomendar livros que já estão na biblioteca do usuário', async () => {
      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          domain: 'book',
          externalId: 'vol-1',
          title: 'Livro Existente',
          userRating: 5,
          status: 'completed',
          extraMeta: {
            authors: ['Autor Teste'],
          },
        } as any,
      ]);

      vi.mocked(booksService.searchBooksByAuthor).mockResolvedValue([
        {
          id: 'vol-1', // Mesmo ID
          title: 'Livro Existente',
          authors: ['Autor Teste'],
          coverUrl: null,
          releaseYear: 2020,
          categories: [],
        },
        {
          id: 'vol-2', // Novo livro
          title: 'Livro Inédito',
          authors: ['Autor Teste'],
          coverUrl: null,
          releaseYear: 2022,
          categories: [],
        },
      ]);
      vi.mocked(booksService.searchBooksBySubject).mockResolvedValue([]);
      vi.mocked(booksService.fetchPopularBooks).mockResolvedValue([]);

      const recs = await getUserBookRecommendations(mockUserId, { limit: 5 });

      expect(recs).toHaveLength(1);
      expect(recs[0].id).toBe('vol-2');
    });
  });
});
