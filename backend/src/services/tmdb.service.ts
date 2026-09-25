const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Tipos brutos da API do TMDB (campos que nos interessam)
interface TmdbWatchProviderRaw {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

interface TmdbWatchProvidersCountryRaw {
  link?: string;
  flatrate?: TmdbWatchProviderRaw[];
  rent?: TmdbWatchProviderRaw[];
  buy?: TmdbWatchProviderRaw[];
}

interface TmdbWatchProvidersResponseRaw {
  results?: Record<string, TmdbWatchProvidersCountryRaw>;
}

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

interface TmdbDetailsResponseRaw extends TmdbMediaRaw {
  genres?: { id: number; name: string }[];
  'watch/providers'?: TmdbWatchProvidersResponseRaw;
}

interface TmdbSearchResponse {
  results: TmdbMediaRaw[];
  total_results: number;
  total_pages: number;
}

// Provedor de streaming normalizado
export interface WatchProvider {
  id: number;
  name: string;
  logoUrl: string;
}

export interface WatchProvidersData {
  link?: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
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
  watchProviders?: WatchProvidersData | null;
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

function normalizeMedia(
  raw: TmdbMediaRaw,
  mediaType: 'movie' | 'tv',
  watchProviders: WatchProvidersData | null = null
): MediaDetails {
  const releaseDate =
    (raw.release_date && raw.release_date.trim()) ||
    (raw.first_air_date && raw.first_air_date.trim()) ||
    null;

  return {
    id: raw.id,
    title: raw.title ?? raw.name ?? 'Título indisponível',
    overview: raw.overview || 'Sinopse não disponível em português.',
    posterUrl: raw.poster_path ? `${TMDB_IMAGE_BASE}/w500${raw.poster_path}` : null,
    backdropUrl: raw.backdrop_path ? `${TMDB_IMAGE_BASE}/original${raw.backdrop_path}` : null,
    releaseDate,
    mediaType,
    voteAverage: raw.vote_average ?? null,
    genreIds: raw.genre_ids,
    watchProviders,
  };
}

export async function fetchMediaDetails(
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MediaDetails | null> {
  const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?language=pt-BR&append_to_response=watch/providers`;

  try {
    const response = await fetch(url, { headers: getHeaders() });

    if (!response.ok) {
      throw new Error(`Erro TMDB: ${response.status}`);
    }

    const data = (await response.json()) as TmdbDetailsResponseRaw;
    const genreIds = data.genres ? data.genres.map((g) => g.id) : data.genre_ids;

    let watchProviders: WatchProvidersData | null = null;
    const brProviders = data['watch/providers']?.results?.BR;

    if (brProviders) {
      const mapProvider = (item: TmdbWatchProviderRaw): WatchProvider => ({
        id: item.provider_id,
        name: item.provider_name,
        logoUrl: `${TMDB_IMAGE_BASE}/w185${item.logo_path}`,
      });

      watchProviders = {
        link: brProviders.link ?? null,
        flatrate: (brProviders.flatrate ?? []).map(mapProvider),
        rent: (brProviders.rent ?? []).map(mapProvider),
        buy: (brProviders.buy ?? []).map(mapProvider),
      };
    }

    return normalizeMedia({ ...data, genre_ids: genreIds }, mediaType, watchProviders);
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

    const data = (await response.json()) as { results: (TmdbMediaRaw & { media_type?: string })[] };
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

export interface TvEpisodeInfo {
  id: number;
  name: string;
  overview: string;
  airDate: string;
  episodeNumber: number;
  seasonNumber: number;
  stillUrl: string | null;
  seriesTitle: string;
  posterUrl: string | null;
}

export async function fetchTvLatestEpisode(tvId: number): Promise<TvEpisodeInfo | null> {
  const url = `${TMDB_BASE_URL}/tv/${tvId}?language=pt-BR`;

  try {
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      name?: string;
      poster_path?: string | null;
      last_episode_to_air?: {
        id: number;
        name?: string;
        overview?: string;
        air_date?: string;
        episode_number: number;
        season_number: number;
        still_path?: string | null;
      } | null;
    };

    const ep = data.last_episode_to_air;
    if (!ep) return null;

    return {
      id: ep.id,
      name: ep.name || `Episódio ${ep.episode_number}`,
      overview: ep.overview || '',
      airDate: ep.air_date || '',
      episodeNumber: ep.episode_number,
      seasonNumber: ep.season_number,
      stillUrl: ep.still_path ? `${TMDB_IMAGE_BASE}/w500${ep.still_path}` : null,
      seriesTitle: data.name || 'Série',
      posterUrl: data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : null,
    };
  } catch (error) {
    console.error('Falha ao buscar último episódio da série no TMDB:', error);
    return null;
  }
}

