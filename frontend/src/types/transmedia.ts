export type TransmediaDomain = 'movie' | 'tv' | 'game' | 'book' | 'comic';

export interface TransmediaSourceItem {
  externalId: string;
  domain: TransmediaDomain;
  title: string;
  userRating?: number | null;
  status?: string;
}

export interface TransmediaTargetItem {
  externalId: string;
  domain: TransmediaDomain;
  title: string;
  coverUrl: string | null;
  releaseYear: number | null;
  creatorOrAuthor?: string;
  overview?: string;
  mediaType?: 'movie' | 'tv';
  extraMeta?: Record<string, unknown>;
}

export interface TransmediaRecommendationItem {
  franchiseName: string;
  sourceItem: TransmediaSourceItem;
  targetItem: TransmediaTargetItem;
  reason: string;
  score: number;
  isColdStart: boolean;
}

export interface DomainMetric {
  count: number;
  percentage: number;
  averageRating: number | null;
}

export interface StatusMetric {
  count: number;
  percentage: number;
}

export interface TopFranchise {
  name: string;
  count: number;
  domains: TransmediaDomain[];
}

export interface ArchiveStatsResponse {
  totalItems: number;
  domainBreakdown: Record<TransmediaDomain, DomainMetric>;
  statusBreakdown: {
    plan_to_watch: StatusMetric;
    watching: StatusMetric;
    completed: StatusMetric;
    dropped: StatusMetric;
  };
  ratingStats: {
    average: number;
    ratedCount: number;
    distribution: Record<string, number>;
  };
  consumptionMetrics: {
    estimatedScreenHours: number;
    estimatedGameHours: number;
    estimatedPagesRead: number;
    totalComicVolumes: number;
  };
  franchiseStats: {
    totalFranchises: number;
    topFranchises: TopFranchise[];
  };
  diversityIndex: {
    score: number;
    archetypeTitle: string;
    archetypeDescription: string;
  };
}

export interface CanonicalFranchiseSummary {
  id: string;
  name: string;
  mediaCount: number;
  availableDomains: TransmediaDomain[];
  medias: Array<{
    externalId: string;
    domain: TransmediaDomain;
    title: string;
    releaseYear: number | null;
    coverUrl: string | null;
    creatorOrAuthor?: string;
    overview?: string;
  }>;
}
