import { z } from 'zod';

export const searchBooksQuerySchema = z.object({
  q: z.string().min(1, 'Parâmetro de busca "q" é obrigatório.'),
  limit: z.coerce.number().int().positive().max(40).default(12),
});

export const popularBooksQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(40).default(12),
});

export const bookRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(30).default(10),
});

export type SearchBooksQuery = z.infer<typeof searchBooksQuerySchema>;
export type PopularBooksQuery = z.infer<typeof popularBooksQuerySchema>;
export type BookRecommendationsQuery = z.infer<typeof bookRecommendationsQuerySchema>;
