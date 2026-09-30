import { describe, it, expect } from 'vitest';
import { createWishlistItemSchema, updateWishlistItemSchema } from '../../src/schemas/wishlist.schema.js';

describe('Zod Schema: createWishlistItemSchema', () => {
  it('deve validar um payload válido', () => {
    const payload = {
      tmdbId: 123,
      mediaType: 'movie',
      status: 'watching',
      userRating: 5,
      notes: 'Muito bom!',
    };
    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar se tmdbId não for número positivo', () => {
    const payload = { tmdbId: -1, mediaType: 'movie' };
    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('deve rejeitar mediaType inválido', () => {
    const payload = { tmdbId: 123, mediaType: 'anime' };
    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('deve preencher o status default caso não fornecido', () => {
    const payload = { tmdbId: 123, mediaType: 'tv' };
    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('plan_to_watch');
    }
  });

  it('deve rejeitar userRating fora do limite 1-5', () => {
    const resultLow = createWishlistItemSchema.safeParse({ tmdbId: 1, mediaType: 'movie', userRating: 0 });
    const resultHigh = createWishlistItemSchema.safeParse({ tmdbId: 1, mediaType: 'movie', userRating: 6 });
    expect(resultLow.success).toBe(false);
    expect(resultHigh.success).toBe(false);
  });

  it('deve aceitar e validar um item de jogo (game) com externalId e metadados', () => {
    const payload = {
      domain: 'game',
      externalId: '1024',
      status: 'in_progress', // alias de watching
      userRating: 5,
      notes: 'Jogabilidade impecável!',
      title: 'The Witcher 3: Wild Hunt',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
      releaseYear: 2015,
      extraMeta: { platforms: ['PC', 'PlayStation 5'], genres: ['RPG'] },
    };

    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('game');
      expect(result.data.externalId).toBe('1024');
      expect(result.data.status).toBe('watching'); // normalizado de in_progress
      expect(result.data.title).toBe('The Witcher 3: Wild Hunt');
      expect(result.data.coverUrl).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg');
      expect(result.data.releaseYear).toBe(2015);
    }
  });

  it('deve converter alias backlog para plan_to_watch', () => {
    const payload = {
      domain: 'game',
      externalId: '2048',
      status: 'backlog',
    };
    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('plan_to_watch');
    }
  });

  it('deve aceitar e validar um item literário (book) com externalId e metadados editoriais', () => {
    const payload = {
      domain: 'book',
      externalId: 'OL1003040W',
      status: 'watching',
      title: 'Dom Casmurro',
      coverUrl: 'https://covers.openlibrary.org/b/id/647501-L.jpg',
      releaseYear: 1899,
      extraMeta: {
        authors: ['Machado de Assis'],
        pageCount: 256,
        isbn13: '9788535914849',
      },
    };
    const result = createWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe('book');
      expect(result.data.externalId).toBe('OL1003040W');
      expect(result.data.status).toBe('watching');
      expect(result.data.title).toBe('Dom Casmurro');
      expect(result.data.coverUrl).toBe('https://covers.openlibrary.org/b/id/647501-L.jpg');
    }
  });
});

describe('Zod Schema: updateWishlistItemSchema', () => {
  it('deve validar um payload de atualização válido', () => {
    const payload = { status: 'completed', userRating: 4 };
    const result = updateWishlistItemSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('deve aceitar payload vazio (tudo opcional)', () => {
    const result = updateWishlistItemSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('deve aceitar notes como null ou texto de até 300 caracteres', () => {
    const validWithNull = updateWishlistItemSchema.safeParse({ notes: null });
    const validWithText = updateWishlistItemSchema.safeParse({ notes: 'Opinião excelente sobre a obra' });
    const invalidTooLong = updateWishlistItemSchema.safeParse({ notes: 'a'.repeat(301) });

    expect(validWithNull.success).toBe(true);
    expect(validWithText.success).toBe(true);
    expect(invalidTooLong.success).toBe(false);
  });

  it('deve rejeitar valores incorretos', () => {
    const result = updateWishlistItemSchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });
});

