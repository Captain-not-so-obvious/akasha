const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Tipos brutos da API do TMDB (campos que nos interessam)
interface TmdbMediaRaw {
  id: number;
  title?: string;        // Filmes usam 'title'
  name?: string;         // Séries usam 'name'
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
}

interface TmdbSearchResponse {
  results: TmdbMediaRaw[];
  total_results: number;
  total_pages: number;
}

// Tipo normalizado que expõe o restante do sistema
export interface MediaDetails {
  id: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  mediaType: 'movie' | 'tv';
  voteAverage: number | null;
}

export interface SearchResult {
  results: MediaDetails[];
  totalResults: number;
  totalPages: number;
}

function getHeaders(): Record<string, string> {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token) {
    throw new Error('TMDB_READ_ACCESS_TOKEN não configurado.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json;charset=utf-8',
  };
}

function normalizeMedia(raw: TmdbMediaRaw, mediaType: 'movie' | 'tv'): MediaDetails {
  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? 'Título indisponível',
    overview: raw.overview || 'Sinopse não disponível em português.',
    posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE}/w500${raw.poster_path}` : null,
    backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE}/original${raw.backdrop_path}` : null,
    releaseDate: raw.release_date ?? raw.first_air_date ?? null,
    mediaType,
    voteAverage: raw.vote_average ?? null,
  };
}

export async function fetchMediaDetails(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaDetails | null> {
  const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?language=pt-BR`;

  try {
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error(`Erro TMDB: ${response.status}`);
    }

    const data: TmdbMediaRaw = await response.json() as TmdbMediaRaw;
    return normalizeMedia(data, mediaType);
  } catch (error) {
    console.error('Falha ao buscar detalhes no TMDB:', error);
    return null;
  }
}

export async function searchMedia(
  query: string,
  mediaType: 'movie' | 'tv',
  page = 1
): Promise<SearchResult | null> {
  const endpoint = mediaType === 'movie' ? 'search/movie' : 'search/tv';
  const url = `${TMDB_BASE_URL}/${endpoint}?query=${encodeURIComponent(query)}&language=pt-BR&page=${page}`;

  try {
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error(`Erro TMDB search: ${response.status}`);
    }

    const data: TmdbSearchResponse = await response.json() as TmdbSearchResponse;

    return {
      results: data.results.map((item) => normalizeMedia(item, mediaType)),
      totalResults: data.total_results,
      totalPages: data.total_pages,
    };
  } catch (error) {
    console.error('Falha ao buscar no TMDB:', error);
    return null;
  }
}
