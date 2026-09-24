import { describe, it, expect } from 'vitest';
import { getFeedQuerySchema } from '../../src/schemas/feed.schema.js';

describe('Zod Schema: getFeedQuerySchema', () => {
  it('deve usar valores padrão para page (1) e limit (20)', () => {
    const result = getFeedQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('deve converter strings numéricas de query params para números', () => {
    const result = getFeedQuerySchema.safeParse({ page: '2', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it('deve rejeitar limit superior a 50 ou page menor que 1', () => {
    const resultHighLimit = getFeedQuerySchema.safeParse({ limit: '100' });
    const resultInvalidPage = getFeedQuerySchema.safeParse({ page: '0' });
    expect(resultHighLimit.success).toBe(false);
    expect(resultInvalidPage.success).toBe(false);
  });
});
