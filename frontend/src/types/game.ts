export interface GameDetails {
  id: string;
  title: string;
  slug?: string;
  summary?: string;
  coverUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  genres: string[];
  platforms: string[];
  developer?: string;
  publisher?: string;
  rating?: number;
  score?: number;
  reason?: string;
}

export interface GameRecommendationItem {
  id: string;
  title: string;
  coverUrl: string | null;
  backdropUrl: string | null;
  releaseYear: number | null;
  genres: string[];
  platforms: string[];
  developer?: string;
  rating?: number;
  score: number;
  reason: string;
  summary?: string;
}
