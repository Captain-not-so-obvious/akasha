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

export interface WatchTogetherItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterUrl: string | null;
}

export interface RatedOverlapItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterUrl: string | null;
  myRating: number;
  friendRating: number;
  myReview: string | null;
  friendReview: string | null;
  delta: number;
}

export interface FriendRecommendationItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterUrl: string | null;
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
  watchTogether: WatchTogetherItem[];
  ratedOverlap: RatedOverlapItem[];
  friendRecommendations: FriendRecommendationItem[];
}
