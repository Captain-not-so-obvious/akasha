export interface RecommendedItem {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  mediaType: 'movie' | 'tv';
  voteAverage: number | null;
  reason: string;
  score: number;
  isColdStart: boolean;
}

export interface RecommendationQueryOptions {
  limit?: number;
  mediaType?: 'movie' | 'tv' | 'all';
}
