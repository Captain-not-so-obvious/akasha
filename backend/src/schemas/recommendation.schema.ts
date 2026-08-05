import { z } from 'zod';

export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  mediaType: z.enum(['movie', 'tv', 'all']).default('all'),
});

export const recommendedItemSchema = z.object({
  tmdbId: z.number().int(),
  title: z.string(),
  overview: z.string(),
  posterUrl: z.string().nullable(),
  backdropUrl: z.string().nullable(),
  mediaType: z.enum(['movie', 'tv']),
  voteAverage: z.number().nullable(),
  reason: z.string(),
  score: z.number(),
  isColdStart: z.boolean().default(false),
});

export type RecommendationQueryInput = z.infer<typeof recommendationQuerySchema>;
export type RecommendedItem = z.infer<typeof recommendedItemSchema>;
