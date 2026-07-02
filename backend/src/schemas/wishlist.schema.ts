import { z } from 'zod';

// Zod infere o tipo TypeScript automaticamente — sem interfaces manuais

export const createWishlistItemSchema = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(['movie', 'tv']),
  status: z
    .enum(['plan_to_watch', 'watching', 'completed', 'dropped'])
    .default('plan_to_watch'),
  userRating: z.number().int().min(1).max(5).optional(), // 1 a 5 estrelas
  notes: z.string().max(500).optional(),
});

export const updateWishlistItemSchema = z.object({
  status: z.enum(['plan_to_watch', 'watching', 'completed', 'dropped']).optional(),
  userRating: z.number().int().min(1).max(5).optional(), // 1 a 5 estrelas
  notes: z.string().max(500).optional(),
});

// Tipos inferidos automaticamente do schema Zod
export type CreateWishlistItemInput = z.infer<typeof createWishlistItemSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>;
