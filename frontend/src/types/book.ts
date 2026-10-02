export interface BookDetails {
  id: string; // Google Books Volume ID
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  releaseYear: number | null;
  description?: string;
  pageCount?: number;
  categories: string[];
  averageRating?: number;
  ratingsCount?: number;
  coverUrl: string | null;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  previewLink?: string;
  reason?: string;
}

export interface BookRecommendationItem {
  id: string; // Google Books Volume ID
  title: string;
  authors: string[];
  coverUrl: string | null;
  releaseYear: number | null;
  categories: string[];
  pageCount?: number;
  score: number;
  reason: string;
  description?: string;
}
