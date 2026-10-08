export type AffinityLabel =
  | 'Almas Cósmicas'
  | 'Frequência Harmônica'
  | 'Mundos Paralelos'
  | 'Caos Gravitacional';

export interface AffinityResult {
  percentage: number;
  label: AffinityLabel;
  totalShared: number;
  totalOverlapRated: number;
}

export type DomainType = 'movie' | 'tv' | 'game' | 'book' | 'comic';

export interface ComparisonItem {
  domain: DomainType;
  externalId: string;
  title: string;
  coverUrl: string | null;
  releaseYear?: number | null;
  tmdbId?: number | null;
  mediaType?: 'movie' | 'tv' | null;
}

export interface WatchTogetherItem extends ComparisonItem {}

export interface RatedOverlapItem extends ComparisonItem {
  myRating: number;
  friendRating: number;
  myReview: string | null;
  friendReview: string | null;
  delta: number;
}

export interface FriendRecommendationItem extends ComparisonItem {
  friendRating: number;
  friendReview: string | null;
  inMyBacklog: boolean;
}

export interface ComparisonResult {
  friend: {
    id: string;
    username: string;
    avatarUrl: string | null;
    friendCode: string | null;
  };
  affinity: AffinityResult;
  domainAffinities?: Partial<Record<DomainType, AffinityResult>>;
  watchTogether: WatchTogetherItem[];
  ratedOverlap: RatedOverlapItem[];
  friendRecommendations: FriendRecommendationItem[];
}
