import { describe, it, expect } from 'vitest';
import { createWishlistItemSchema, updateWishlistItemSchema } from './wishlist.schema.js';

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

  it('deve rejeitar valores incorretos', () => {
    const result = updateWishlistItemSchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });
});
