import { z } from 'zod';

// Status compatíveis tanto com o legado quanto com os termos universais da SPEC-001
export const consumptionStatusSchema = z
  .enum([
    'plan_to_watch',
    'watching',
    'completed',
    'dropped',
    'backlog',
    'in_progress',
  ])
  .transform((val) => {
    if (val === 'backlog') return 'plan_to_watch';
    if (val === 'in_progress') return 'watching';
    return val;
  });

export const domainTypeSchema = z.enum(['movie', 'tv', 'game', 'book', 'comic']);

export const createWishlistItemSchema = z
  .object({
    domain: domainTypeSchema.optional(),
    externalId: z.string().min(1).optional(),
    tmdbId: z.number().int().positive().optional(),
    mediaType: z.enum(['movie', 'tv']).optional(),
    status: consumptionStatusSchema.default('plan_to_watch'),
    userRating: z.number().int().min(1).max(5).optional(), // 1 a 5 estrelas
    notes: z.string().max(300).nullable().optional(),
    title: z.string().optional(),
    posterPath: z.string().optional(),
    coverUrl: z.string().optional(),
    releaseYear: z.number().int().optional(),
    extraMeta: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.externalId !== undefined || data.tmdbId !== undefined, {
    message: 'É obrigatório fornecer externalId ou tmdbId',
    path: ['externalId'],
  })
  .transform((data) => {
    const inferredDomain =
      data.domain || (data.mediaType as 'movie' | 'tv') || 'movie';
    const finalExternalId = data.externalId ?? String(data.tmdbId);
    const finalCoverUrl = data.coverUrl ?? data.posterPath ?? null;

    return {
      ...data,
      domain: inferredDomain,
      externalId: finalExternalId,
      coverUrl: finalCoverUrl,
      tmdbId: data.tmdbId ?? (inferredDomain === 'movie' || inferredDomain === 'tv' ? Number(finalExternalId) || undefined : undefined),
      mediaType: data.mediaType ?? (inferredDomain === 'movie' || inferredDomain === 'tv' ? (inferredDomain as 'movie' | 'tv') : undefined),
    };
  });

export const updateWishlistItemSchema = z.object({
  status: consumptionStatusSchema.optional(),
  userRating: z.number().int().min(1).max(5).optional(), // 1 a 5 estrelas
  notes: z.string().max(300).nullable().optional(),
  title: z.string().optional(),
  posterPath: z.string().optional(),
  coverUrl: z.string().optional(),
  releaseYear: z.number().int().optional(),
  extraMeta: z.record(z.unknown()).optional(),
});

export const listWishlistQuerySchema = z.object({
  domain: domainTypeSchema.optional(),
  status: z.enum(['plan_to_watch', 'watching', 'completed', 'dropped']).optional(),
});

// Tipos inferidos automaticamente dos schemas Zod
export type CreateWishlistItemInput = z.infer<typeof createWishlistItemSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemSchema>;
export type ListWishlistQueryInput = z.infer<typeof listWishlistQuerySchema>;
