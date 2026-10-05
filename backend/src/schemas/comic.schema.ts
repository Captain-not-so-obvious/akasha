import { z } from 'zod';

export const searchComicsQuerySchema = z.object({
  q: z.string().min(1, 'Parâmetro de busca "q" é obrigatório.'),
  type: z.enum(['all', 'comic', 'manga']).default('all'),
  limit: z.coerce.number().int().positive().max(40).default(12),
});

export const popularComicsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(40).default(12),
});

export const comicRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(30).default(10),
});

export const comicIdParamSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório.'),
});

export type SearchComicsQuery = z.infer<typeof searchComicsQuerySchema>;
export type PopularComicsQuery = z.infer<typeof popularComicsQuerySchema>;
export type ComicRecommendationsQuery = z.infer<typeof comicRecommendationsQuerySchema>;
export type ComicIdParam = z.infer<typeof comicIdParamSchema>;
