import { z } from 'zod';

export const TransmediaDomainSchema = z.enum(['movie', 'tv', 'game', 'book', 'comic']);
export type TransmediaDomain = z.infer<typeof TransmediaDomainSchema>;

export const TransmediaRecommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type TransmediaRecommendationQuery = z.infer<typeof TransmediaRecommendationQuerySchema>;

export const TransmediaSourceItemSchema = z.object({
  externalId: z.string(),
  domain: TransmediaDomainSchema,
  title: z.string(),
  userRating: z.number().nullable().optional(),
  status: z.string().optional(),
});
export type TransmediaSourceItem = z.infer<typeof TransmediaSourceItemSchema>;

export const TransmediaTargetItemSchema = z.object({
  externalId: z.string(),
  domain: TransmediaDomainSchema,
  title: z.string(),
  coverUrl: z.string().nullable(),
  releaseYear: z.number().nullable(),
  creatorOrAuthor: z.string().optional(),
  overview: z.string().optional(),
  mediaType: z.enum(['movie', 'tv']).optional(),
  extraMeta: z.record(z.unknown()).optional(),
});
export type TransmediaTargetItem = z.infer<typeof TransmediaTargetItemSchema>;

export const TransmediaRecommendationItemSchema = z.object({
  franchiseName: z.string(),
  sourceItem: TransmediaSourceItemSchema,
  targetItem: TransmediaTargetItemSchema,
  reason: z.string(),
  score: z.number(),
  isColdStart: z.boolean(),
});
export type TransmediaRecommendationItem = z.infer<typeof TransmediaRecommendationItemSchema>;

export const DomainMetricSchema = z.object({
  count: z.number(),
  percentage: z.number(),
  averageRating: z.number().nullable(),
});

export const StatusMetricSchema = z.object({
  count: z.number(),
  percentage: z.number(),
});

export const TopFranchiseSchema = z.object({
  name: z.string(),
  count: z.number(),
  domains: z.array(TransmediaDomainSchema),
});

export const ArchiveStatsResponseSchema = z.object({
  totalItems: z.number(),
  domainBreakdown: z.record(TransmediaDomainSchema, DomainMetricSchema),
  statusBreakdown: z.object({
    plan_to_watch: StatusMetricSchema,
    watching: StatusMetricSchema,
    completed: StatusMetricSchema,
    dropped: StatusMetricSchema,
  }),
  ratingStats: z.object({
    average: z.number(),
    ratedCount: z.number(),
    distribution: z.record(z.string(), z.number()),
  }),
  consumptionMetrics: z.object({
    estimatedScreenHours: z.number(),
    estimatedGameHours: z.number(),
    estimatedPagesRead: z.number(),
    totalComicVolumes: z.number(),
  }),
  franchiseStats: z.object({
    totalFranchises: z.number(),
    topFranchises: z.array(TopFranchiseSchema),
  }),
  diversityIndex: z.object({
    score: z.number(), // 0 a 100
    archetypeTitle: z.string(),
    archetypeDescription: z.string(),
  }),
});
export type ArchiveStatsResponse = z.infer<typeof ArchiveStatsResponseSchema>;
