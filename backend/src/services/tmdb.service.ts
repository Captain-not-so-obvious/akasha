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
  genreIds?: number[];
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
    genreIds: raw.genre_ids,
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

    const data: TmdbMediaRaw & { genres?: { id: number; name: string }[] } = await response.json() as any;
    const genreIds = data.genres ? data.genres.map((g) => g.id) : data.genre_ids;
    return normalizeMedia({ ...data, genre_ids: genreIds }, mediaType);
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

export async function fetchMediaRecommendations(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaDetails[]> {
  const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/recommendations?language=pt-BR&page=1`;

  try {
    const response = await fetch(url, { headers: getHeaders() });
    if (response.ok) {
      const data: TmdbSearchResponse = await response.json() as TmdbSearchResponse;
      if (data.results && data.results.length > 0) {
        return data.results.map((item) => normalizeMedia(item, mediaType));
      }
    }

    // Fallback inteligente: Se o endpoint de recomendações do TMDB retornar vazio (comum em séries de TV),
    // busca o endpoint /similar que retorna mídias do mesmo gênero e temática
    const similarUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/similar?language=pt-BR&page=1`;
    const similarResponse = await fetch(similarUrl, { headers: getHeaders() });
    if (!similarResponse.ok) return [];

    const similarData: TmdbSearchResponse = await similarResponse.json() as TmdbSearchResponse;
    return (similarData.results || []).map((item) => normalizeMedia(item, mediaType));
  } catch (error) {
    console.error('Falha ao buscar recomendações/similares no TMDB:', error);
    return [];
  }
}

export async function fetchTrendingMedia(
  mediaType: 'movie' | 'tv' | 'all' = 'all'
): Promise<MediaDetails[]> {
  const typeParam = mediaType === 'all' ? 'all' : mediaType;
  const url = `${TMDB_BASE_URL}/trending/${typeParam}/week?language=pt-BR`;

  try {
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) return [];

    const data: { results: (TmdbMediaRaw & { media_type?: string })[] } = await response.json() as any;
    return data.results
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv' || mediaType !== 'all')
      .map((item) => {
        const itemType = (item.media_type as 'movie' | 'tv') || (mediaType === 'tv' ? 'tv' : 'movie');
        return normalizeMedia(item, itemType);
      });
  } catch (error) {
    console.error('Falha ao buscar trending TMDB:', error);
    return [];
  }
}

