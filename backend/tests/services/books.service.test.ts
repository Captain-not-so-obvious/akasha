import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeGoogleBook,
  normalizeOpenLibraryDoc,
  searchBooks,
  fetchBookDetails,
  fetchPopularBooks,
  searchBooksByAuthor,
  searchBooksBySubject,
} from '../../src/services/books.service.js';

describe('Books Service (Google Books API)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('normalizeGoogleBook', () => {
    it('deve normalizar corretamente um volume completo da Google Books API', () => {
      const rawVolume = {
        id: 'vol-123',
        volumeInfo: {
          title: 'Dom Casmurro',
          subtitle: 'Edição Comentada',
          authors: ['Machado de Assis'],
          publisher: 'Editora Clássica',
          publishedDate: '1899-01-01',
          description: '<p>A história de <b>Bentinho</b> e Capitu.</p>',
          pageCount: 256,
          categories: ['Fiction', 'Classics'],
          averageRating: 4.8,
          ratingsCount: 150,
          imageLinks: {
            thumbnail: 'http://books.google.com/books/content?id=vol-123&printsec=frontcover&img=1&zoom=1',
          },
          industryIdentifiers: [
            { type: 'ISBN_10', identifier: '8535914846' },
            { type: 'ISBN_13', identifier: '9788535914849' },
          ],
          language: 'pt',
          previewLink: 'https://books.google.com.br/books?id=vol-123',
        },
      };

      const normalized = normalizeGoogleBook(rawVolume);

      expect(normalized.id).toBe('vol-123');
      expect(normalized.title).toBe('Dom Casmurro');
      expect(normalized.subtitle).toBe('Edição Comentada');
      expect(normalized.authors).toEqual(['Machado de Assis']);
      expect(normalized.releaseYear).toBe(1899);
      expect(normalized.description).toBe('A história de Bentinho e Capitu.');
      expect(normalized.pageCount).toBe(256);
      expect(normalized.categories).toEqual(['Fiction', 'Classics']);
      expect(normalized.averageRating).toBe(4.8);
      expect(normalized.coverUrl).toBe('https://books.google.com/books/content?id=vol-123&printsec=frontcover&img=1&zoom=1');
      expect(normalized.isbn10).toBe('8535914846');
      expect(normalized.isbn13).toBe('9788535914849');
    });

    it('deve tratar com segurança volumes com campos vazios ou ausentes', () => {
      const rawVolume = {
        id: 'vol-empty',
        volumeInfo: {},
      };

      const normalized = normalizeGoogleBook(rawVolume);

      expect(normalized.id).toBe('vol-empty');
      expect(normalized.title).toBe('Sem título');
      expect(normalized.authors).toEqual(['Autor Desconhecido']);
      expect(normalized.releaseYear).toBeNull();
      expect(normalized.description).toBeUndefined();
      expect(normalized.coverUrl).toBeNull();
      expect(normalized.categories).toEqual([]);
    });
  });

  describe('searchBooks', () => {
    it('deve retornar lista vazia se a query for vazia ou conter apenas espaços', async () => {
      const results = await searchBooks('   ');
      expect(results).toEqual([]);
    });

    it('deve buscar e normalizar livros para busca textual', async () => {
      const mockApiResponse = {
        totalItems: 1,
        items: [
          {
            id: 'mock-1',
            volumeInfo: {
              title: 'Memórias Póstumas de Brás Cubas',
              authors: ['Machado de Assis'],
              publishedDate: '1881',
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });

      const results = await searchBooks('machado', 10);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Memórias Póstumas de Brás Cubas');
      expect(results[0].releaseYear).toBe(1881);
    });

    it('deve formatar adequadamente busca por ISBN', async () => {
      const mockApiResponse = {
        totalItems: 1,
        items: [
          {
            id: 'isbn-vol',
            volumeInfo: {
              title: 'O Hobbit',
              authors: ['J.R.R. Tolkien'],
            },
          },
        ],
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });
      global.fetch = fetchMock;

      const results = await searchBooks('9788595084742', 5);

      expect(results).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('q=isbn%3A9788595084742')
      );
    });
  });

  describe('fetchBookDetails', () => {
    it('deve retornar null se volumeId for vazio', async () => {
      const res = await fetchBookDetails('');
      expect(res).toBeNull();
    });

    it('deve retornar detalhes do livro quando encontrado', async () => {
      const mockVolume = {
        id: 'vol-xyz',
        volumeInfo: {
          title: 'Grande Sertão: Veredas',
          authors: ['João Guimarães Rosa'],
          publishedDate: '1956',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockVolume,
      });

      const book = await fetchBookDetails('vol-xyz');

      expect(book).not.toBeNull();
      expect(book?.title).toBe('Grande Sertão: Veredas');
      expect(book?.authors).toContain('João Guimarães Rosa');
    });

    it('deve retornar null se a API retornar 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const book = await fetchBookDetails('inexistente');
      expect(book).toBeNull();
    });
  });

  describe('fetchPopularBooks, searchBooksByAuthor, searchBooksBySubject', () => {
    it('fetchPopularBooks deve retornar livros populares', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ id: 'pop-1', volumeInfo: { title: 'Livro Popular' } }],
        }),
      });

      const books = await fetchPopularBooks(5);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Livro Popular');
    });

    it('searchBooksByAuthor deve buscar livros por autor', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ id: 'auth-1', volumeInfo: { title: 'Livro do Autor', authors: ['Autor Teste'] } }],
        }),
      });
      global.fetch = fetchMock;

      const books = await searchBooksByAuthor('Autor Teste', 5);
      expect(books).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('inauthor%3A%22Autor%20Teste%22'));
    });

    it('searchBooksBySubject deve buscar livros por categoria', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ id: 'sub-1', volumeInfo: { title: 'Livro Sci-Fi', categories: ['Science Fiction'] } }],
        }),
      });
      global.fetch = fetchMock;

      const books = await searchBooksBySubject('Science Fiction', 5);
      expect(books).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('subject%3A%22Science%20Fiction%22'));
    });
  });

  describe('Open Library Resilient Fallback', () => {
    it('deve normalizar corretamente um documento da Open Library', () => {
      const doc = {
        key: '/works/OL1003040W',
        title: 'Dom Casmurro',
        author_name: ['Machado de Assis'],
        first_publish_year: 1899,
        cover_i: 647501,
        publisher: ['Editora Nacional'],
        number_of_pages_median: 280,
        subject: ['Literatura Brasileira', 'Romance'],
        isbn: ['9788535914849'],
      };

      const normalized = normalizeOpenLibraryDoc(doc);
      expect(normalized.id).toBe('OL1003040W');
      expect(normalized.title).toBe('Dom Casmurro');
      expect(normalized.authors).toEqual(['Machado de Assis']);
      expect(normalized.releaseYear).toBe(1899);
      expect(normalized.coverUrl).toBe('https://covers.openlibrary.org/b/id/647501-L.jpg');
      expect(normalized.pageCount).toBe(280);
      expect(normalized.isbn13).toBe('9788535914849');
    });

    it('searchBooks deve acionar fallback para Open Library quando o Google Books retornar HTTP 429 (cota excedida)', async () => {
      const mockOlResponse = {
        numFound: 1,
        docs: [
          {
            key: '/works/OL82563W',
            title: "Harry Potter and the Philosopher's Stone",
            author_name: ['J. K. Rowling'],
            first_publish_year: 1997,
            cover_i: 15155833,
          },
        ],
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('googleapis.com')) {
          return Promise.resolve({
            ok: false,
            status: 429,
          });
        }
        if (url.includes('openlibrary.org/search.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockOlResponse,
          });
        }
        return Promise.reject(new Error('URL inesperada'));
      });

      const results = await searchBooks('Harry Potter', 5);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('OL82563W');
      expect(results[0].title).toBe("Harry Potter and the Philosopher's Stone");
      expect(results[0].authors).toEqual(['J. K. Rowling']);
      expect(results[0].coverUrl).toBe('https://covers.openlibrary.org/b/id/15155833-L.jpg');
    });

    it('fetchBookDetails deve consultar diretamente a Open Library quando o ID começar com OL', async () => {
      const mockWork = {
        title: 'Dom Casmurro',
        description: 'Romance clássico de Machado de Assis.',
      };
      const mockSearch = {
        docs: [
          {
            key: '/works/OL1003040W',
            title: 'Dom Casmurro',
            author_name: ['Machado de Assis'],
            first_publish_year: 1899,
            cover_i: 647501,
          },
        ],
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/works/OL1003040W.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockWork,
          });
        }
        if (url.includes('openlibrary.org/search.json')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockSearch,
          });
        }
        return Promise.reject(new Error('URL inesperada'));
      });

      const book = await fetchBookDetails('OL1003040W');

      expect(book).not.toBeNull();
      expect(book?.title).toBe('Dom Casmurro');
      expect(book?.description).toBe('Romance clássico de Machado de Assis.');
      expect(book?.authors).toEqual(['Machado de Assis']);
    });
  });
});

