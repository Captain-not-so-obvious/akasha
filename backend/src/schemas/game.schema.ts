import { z } from 'zod';

export const searchGamesQuerySchema = z.object({
  q: z.string().min(1, 'Parâmetro de busca "q" é obrigatório.'),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const popularGamesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const gameRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(30).default(10),
});

export type SearchGamesQuery = z.infer<typeof searchGamesQuerySchema>;
export type PopularGamesQuery = z.infer<typeof popularGamesQuerySchema>;
export type GameRecommendationsQuery = z.infer<typeof gameRecommendationsQuerySchema>;
