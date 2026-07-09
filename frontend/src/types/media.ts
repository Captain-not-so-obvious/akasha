/**
 * Tipos que espelham exatamente o contrato da nossa API backend (tmdb.service.ts).
 * Proibido usar `any` — todos os campos são estritamente tipados.
 */

export type MediaType = 'movie' | 'tv';

export interface MediaDetails {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  mediaType: MediaType;
  voteAverage: number | null;
}

export interface SearchResult {
  results: MediaDetails[];
  totalResults: number;
  totalPages: number;
}
