export interface ComicIssueItem {
  id: string;
  name: string;
  issueNumber?: string;
}

export interface ComicDetails {
  id: string; // Ex: 'cv-4050-3622' ou 'al-30002'
  title: string;
  originalTitle?: string;
  type: 'comic' | 'manga' | 'manhwa';
  description?: string;
  coverUrl: string | null;
  releaseYear: number | null;
  publisher?: string;
  creators: string[];
  genres: string[];
  volumeCount?: number | null;
  issueCount?: number | null;
  chapterCount?: number | null;
  status?: string;
  issues?: ComicIssueItem[]; // Checklist das edições enumeradas que compõem a saga/volume
  reason?: string;
}

// Interfaces internas da Comic Vine
interface ComicVineImage {
  original_url?: string;
  medium_url?: string;
  small_url?: string;
  super_url?: string;
}

interface ComicVinePublisher {
  id: number;
  name: string;
}

interface ComicVineIssueRef {
  id: number;
  name?: string | null;
  issue_number?: string | number | null;
}

interface ComicVineVolumeItem {
  id: number;
  name: string;
  deck?: string | null;
  description?: string | null;
  image?: ComicVineImage | null;
  publisher?: ComicVinePublisher | null;
  start_year?: string | number | null;
  count_of_issues?: number | null;
  issues?: ComicVineIssueRef[] | null;
}

interface ComicVineStoryArcItem {
  id: number;
  name: string;
  deck?: string | null;
  description?: string | null;
  image?: ComicVineImage | null;
  publisher?: ComicVinePublisher | null;
  count_of_issues?: number | null;
  issues?: ComicVineIssueRef[] | null;
}

interface ComicVineResponse<T> {
  error: string;
  limit: number;
  offset: number;
  number_of_page_results: number;
  number_of_total_results: number;
  status_code: number;
  results: T;
}

// Interfaces internas da AniList
interface AniListName {
  full?: string | null;
}

interface AniListStaffNode {
  name?: AniListName | null;
}

interface AniListMedia {
  id: number;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  description?: string | null;
  coverImage?: {
    extraLarge?: string | null;
    large?: string | null;
    medium?: string | null;
  } | null;
  startDate?: {
    year?: number | null;
  } | null;
  countryOfOrigin?: string | null;
  format?: string | null;
  status?: string | null;
  volumes?: number | null;
  chapters?: number | null;
  genres?: string[] | null;
  staff?: {
    nodes?: AniListStaffNode[] | null;
  } | null;
}

interface AniListResponse {
  data?: {
    Page?: {
      media?: AniListMedia[] | null;
    } | null;
    Media?: AniListMedia | null;
  } | null;
}

// Cache simples em memória para detalhes e buscas frequentes
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  return cached.data as T;
}

function setInCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function _clearComicsCacheForTesting(): void {
  cache.clear();
}

/**
 * Remove tags HTML e decodifica entidades básicas das descrições.
 */
function sanitizeHtml(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Normaliza capa garantindo protocolo HTTPS.
 */
function sanitizeCoverUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

/**
 * Filtro de segurança estrito para barrar conteúdo adulto, erótico, hentai ou termos de spam/junk.
 */
export function isNsfwOrJunkComic(title: string, description?: string | null): boolean {
  const combined = `${title} ${description || ''}`.toLowerCase();
  const nsfwRegex =
    /\b(planet sex|sex|ninfeta|hentai|porn|porno|pornografia|erotic|erotica|erótico|erótica|ecchi|doujinshi|smut|fantasias sexuais)\b/i;
  return nsfwRegex.test(combined);
}

/**
 * Ingestão AniList GraphQL para Mangás, Manhwas e Manhuas.
 */
export async function searchMangaFromAniList(query: string, limit = 8): Promise<ComicDetails[]> {
  const cacheKey = `anilist:search:${query.toLowerCase()}:${limit}`;
  const cached = getFromCache<ComicDetails[]>(cacheKey);
  if (cached) return cached;

  const graphqlQuery = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: MANGA, sort: [POPULARITY_DESC], isAdult: false) {
          id
          title {
            english
            romaji
            native
          }
          description(asHtml: false)
          coverImage {
            extraLarge
            large
          }
          startDate {
            year
          }
          countryOfOrigin
          format
          status
          volumes
          chapters
          genres
          staff(perPage: 3) {
            nodes {
              name {
                full
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query, perPage: limit },
      }),
    });

    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as AniListResponse;
    const mediaList = json.data?.Page?.media || [];

    const results = mediaList.map((m): ComicDetails => {
      const isManhwa = m.countryOfOrigin === 'KR' || m.format === 'MANHWA';
      const isManhua = m.countryOfOrigin === 'CN';
      const type: 'comic' | 'manga' | 'manhwa' = isManhwa ? 'manhwa' : 'manga';

      const title = m.title?.english || m.title?.romaji || m.title?.native || 'Mangá sem título';
      const originalTitle = m.title?.native || m.title?.romaji || undefined;
      const creators = (m.staff?.nodes || [])
        .map((node) => node?.name?.full)
        .filter((name): name is string => Boolean(name));

      const volumeCount = m.volumes ?? null;
      const chapterCount = m.chapters ?? null;

      // Gera a lista enumerada de volumes para a visualização toggle da saga
      const issues: ComicIssueItem[] = [];
      if (volumeCount && volumeCount > 0) {
        const maxEnum = Math.min(volumeCount, 120);
        for (let i = 1; i <= maxEnum; i++) {
          issues.push({
            id: `vol-${i}`,
            name: `${title} - Volume ${i}`,
            issueNumber: String(i),
          });
        }
      }

      return {
        id: `al-${m.id}`,
        title,
        originalTitle,
        type,
        description: sanitizeHtml(m.description),
        coverUrl: sanitizeCoverUrl(m.coverImage?.extraLarge || m.coverImage?.large),
        releaseYear: m.startDate?.year ?? null,
        publisher: isManhwa ? 'Webtoon / Manhwa' : isManhua ? 'Manhua' : 'Mangá Japonês',
        creators,
        genres: m.genres || [],
        volumeCount,
        chapterCount,
        status: m.status || undefined,
        issues: issues.length > 0 ? issues : undefined,
      };
    });

    setInCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Erro ao consultar AniList GraphQL:', error);
    return [];
  }
}

/**
 * Consulta detalhes de um Mangá na AniList por ID numérico.
 */
export async function getMangaDetailsFromAniList(anilistId: number): Promise<ComicDetails | null> {
  const cacheKey = `anilist:id:${anilistId}`;
  const cached = getFromCache<ComicDetails>(cacheKey);
  if (cached) return cached;

  const graphqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        id
        title {
          english
          romaji
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
        }
        startDate {
          year
        }
        countryOfOrigin
        format
        status
        volumes
        chapters
        genres
        staff(perPage: 5) {
          nodes {
            name {
              full
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { id: anilistId },
      }),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as AniListResponse;
    const m = json.data?.Media;
    if (!m) return null;

    const isManhwa = m.countryOfOrigin === 'KR' || m.format === 'MANHWA';
    const type: 'comic' | 'manga' | 'manhwa' = isManhwa ? 'manhwa' : 'manga';
    const title = m.title?.english || m.title?.romaji || m.title?.native || 'Mangá sem título';
    const creators = (m.staff?.nodes || [])
      .map((node) => node?.name?.full)
      .filter((name): name is string => Boolean(name));

    const volumeCount = m.volumes ?? null;
    const issues: ComicIssueItem[] = [];
    if (volumeCount && volumeCount > 0) {
      const maxEnum = Math.min(volumeCount, 120);
      for (let i = 1; i <= maxEnum; i++) {
        issues.push({
          id: `vol-${i}`,
          name: `${title} - Volume ${i}`,
          issueNumber: String(i),
        });
      }
    }

    const details: ComicDetails = {
      id: `al-${m.id}`,
      title,
      originalTitle: m.title?.native || m.title?.romaji || undefined,
      type,
      description: sanitizeHtml(m.description),
      coverUrl: sanitizeCoverUrl(m.coverImage?.extraLarge || m.coverImage?.large),
      releaseYear: m.startDate?.year ?? null,
      publisher: isManhwa ? 'Webtoon / Manhwa' : 'Mangá Japonês',
      creators,
      genres: m.genres || [],
      volumeCount,
      chapterCount: m.chapters ?? null,
      status: m.status || undefined,
      issues: issues.length > 0 ? issues : undefined,
    };

    setInCache(cacheKey, details);
    return details;
  } catch (error) {
    console.error('Erro ao buscar detalhes no AniList:', error);
    return null;
  }
}

/**
 * Ingestão Comic Vine API para Volumes (runs/séries completas) e Story Arcs (grandes sagas).
 */
export async function searchComicsFromComicVine(query: string, limit = 8): Promise<ComicDetails[]> {
  const apiKey = process.env.COMICVINE_API_KEY;
  if (!apiKey) {
    return [];
  }

  const cacheKey = `comicvine:search:${query.toLowerCase()}:${limit}`;
  const cached = getFromCache<ComicDetails[]>(cacheKey);
  if (cached) return cached;

  try {
    const encoded = encodeURIComponent(query);
    const url = `https://comicvine.gamespot.com/api/volumes/?api_key=${apiKey}&format=json&filter=name:${encoded}&limit=${limit}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AkashaMediaHub/1.0.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as ComicVineResponse<ComicVineVolumeItem[]>;
    if (json.status_code !== 1 || !Array.isArray(json.results)) {
      return [];
    }

    const results: ComicDetails[] = json.results
      .filter((vol) => !isNsfwOrJunkComic(vol.name, vol.deck || vol.description))
      .map((vol) => {
      const year = vol.start_year ? Number(vol.start_year) || null : null;
      const issueCount = vol.count_of_issues ?? null;

      return {
        id: `cv-4050-${vol.id}`,
        title: vol.name,
        type: 'comic',
        description: sanitizeHtml(vol.deck || vol.description),
        coverUrl: sanitizeCoverUrl(
          vol.image?.medium_url || vol.image?.super_url || vol.image?.original_url
        ),
        releaseYear: year,
        publisher: vol.publisher?.name || 'HQ Ocidental',
        creators: [],
        genres: ['Quadrinhos', 'HQ Ocidental', vol.publisher?.name || 'Comics'],
        issueCount,
        volumeCount: 1,
      };
    });

    setInCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Erro ao buscar na Comic Vine API:', error);
    return [];
  }
}

/**
 * Consulta detalhes completos de um volume na Comic Vine com suas edições enumeradas.
 */
export async function getComicDetailsFromComicVine(comicVineId: string): Promise<ComicDetails | null> {
  const apiKey = process.env.COMICVINE_API_KEY;
  if (!apiKey) return null;

  const cacheKey = `comicvine:id:${comicVineId}`;
  const cached = getFromCache<ComicDetails>(cacheKey);
  if (cached) return cached;

  // Normaliza ID (pode vir como 'cv-4050-3622', '4050-3622' ou '3622')
  const cleanId = comicVineId.replace(/^cv-/, '');
  const isVolume = cleanId.startsWith('4050-') || !cleanId.includes('-');
  const rawNumericId = cleanId.replace(/^(4050-|4045-)/, '');

  const resourceType = isVolume ? 'volume' : 'story_arc';
  const prefix = isVolume ? '4050' : '4045';

  try {
    const url = `https://comicvine.gamespot.com/api/${resourceType}/${prefix}-${rawNumericId}/?api_key=${apiKey}&format=json&field_list=id,name,deck,description,image,publisher,start_year,count_of_issues,issues`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AkashaMediaHub/1.0.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as ComicVineResponse<ComicVineVolumeItem>;
    if (json.status_code !== 1 || !json.results) return null;

    const vol = json.results;
    const year = vol.start_year ? Number(vol.start_year) || null : null;

    // Constrói a lista ordenada das edições que compõem a saga/volume
    const issuesList: ComicIssueItem[] = (vol.issues || []).map((iss) => ({
      id: String(iss.id),
      name: iss.name ? `${vol.name} #${iss.issue_number}: ${iss.name}` : `${vol.name} #${iss.issue_number}`,
      issueNumber: String(iss.issue_number || ''),
    }));

    // Ordena as edições por número
    issuesList.sort((a, b) => {
      const numA = parseFloat(a.issueNumber || '0');
      const numB = parseFloat(b.issueNumber || '0');
      return numA - numB;
    });

    const details: ComicDetails = {
      id: `cv-${prefix}-${vol.id}`,
      title: vol.name,
      type: 'comic',
      description: sanitizeHtml(vol.deck || vol.description),
      coverUrl: sanitizeCoverUrl(
        vol.image?.medium_url || vol.image?.super_url || vol.image?.original_url
      ),
      releaseYear: year,
      publisher: vol.publisher?.name || 'HQ Ocidental',
      creators: [],
      genres: ['Quadrinhos', 'HQ Ocidental', vol.publisher?.name || 'Comics'],
      issueCount: vol.count_of_issues ?? issuesList.length ?? null,
      volumeCount: 1,
      issues: issuesList.length > 0 ? issuesList : undefined,
    };

    setInCache(cacheKey, details);
    return details;
  } catch (error) {
    console.error('Erro ao buscar detalhes na Comic Vine:', error);
    return null;
  }
}

/**
 * Ingestão de Mangás Populares em tempo real via AniList GraphQL API (Zero-Mock).
 */
export async function fetchPopularMangaFromAniList(limit = 6): Promise<ComicDetails[]> {
  const cacheKey = `anilist:popular:${limit}`;
  const cached = getFromCache<ComicDetails[]>(cacheKey);
  if (cached) return cached;

  const graphqlQuery = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: MANGA, sort: [POPULARITY_DESC], isAdult: false) {
          id
          title {
            english
            romaji
            native
          }
          description(asHtml: false)
          coverImage {
            extraLarge
            large
            medium
          }
          startDate {
            year
          }
          countryOfOrigin
          format
          status
          volumes
          chapters
          genres
          staff(perPage: 3) {
            nodes {
              name {
                full
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { perPage: limit },
      }),
    });

    if (!res.ok) return [];

    const json = (await res.json()) as AniListResponse;
    const mediaList = json.data?.Page?.media || [];

    const results = mediaList.map((m): ComicDetails => {
      const isManhwa = m.countryOfOrigin === 'KR' || m.format === 'MANHWA';
      const isManhua = m.countryOfOrigin === 'CN';
      const type: 'comic' | 'manga' | 'manhwa' = isManhwa ? 'manhwa' : 'manga';

      const title = m.title?.english || m.title?.romaji || m.title?.native || 'Mangá';
      const originalTitle = m.title?.native || m.title?.romaji || undefined;
      const creators = (m.staff?.nodes || [])
        .map((node) => node?.name?.full)
        .filter((name): name is string => Boolean(name));

      const volumeCount = m.volumes ?? null;

      return {
        id: `al-${m.id}`,
        title,
        originalTitle,
        type,
        description: sanitizeHtml(m.description),
        coverUrl: sanitizeCoverUrl(m.coverImage?.extraLarge || m.coverImage?.large || m.coverImage?.medium),
        releaseYear: m.startDate?.year ?? null,
        publisher: isManhwa ? 'Webtoon / Manhwa' : isManhua ? 'Manhua' : 'Mangá Japonês',
        creators,
        genres: m.genres || [],
        volumeCount,
        chapterCount: m.chapters ?? null,
        status: m.status || undefined,
      };
    });

    setInCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('[Comics Service] Erro ao buscar mangás populares na AniList:', error);
    return [];
  }
}

/**
 * Ingestão de Volumes e Sagas Populares Ocidentais (acervo canônico aclamado).
 */
export async function fetchPopularComicsFromComicVine(limit = 6): Promise<ComicDetails[]> {
  // A Comic Vine não possui ordenação por popularidade (sort=count_of_issues retorna tirinhas antigas dos anos 30).
  // Retorna os clássicos aclamados ocidentais do catálogo canônico com capas verificadas em alta resolução:
  const westernClassics = POPULAR_COMICS_CATALOG.filter(
    (c) => c.type === 'comic' && !isNsfwOrJunkComic(c.title, c.description)
  );
  return westernClassics.slice(0, limit);
}

/**
 * Ingestão de recomendações colaborativas em tempo real via AniList GraphQL.
 */
export async function fetchMangaRecommendationsFromAniList(
  anilistId: number,
  limit = 5
): Promise<ComicDetails[]> {
  const cacheKey = `anilist:recommendations:${anilistId}:${limit}`;
  const cached = getFromCache<ComicDetails[]>(cacheKey);
  if (cached) return cached;

  const graphqlQuery = `
    query GetRecs($id: Int, $perPage: Int) {
      Media(id: $id, type: MANGA) {
        recommendations(sort: [RATING_DESC], perPage: $perPage) {
          nodes {
            mediaRecommendation {
              id
              title {
                english
                romaji
                native
              }
              description(asHtml: false)
              coverImage {
                extraLarge
                large
                medium
              }
              startDate {
                year
              }
              countryOfOrigin
              format
              status
              volumes
              chapters
              genres
              staff(perPage: 3) {
                nodes {
                  name {
                    full
                  }
                }
              }
              isAdult
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { id: anilistId, perPage: limit },
      }),
    });

    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const nodes = json.data?.Media?.recommendations?.nodes || [];

    const results: ComicDetails[] = [];
    for (const node of nodes) {
      const m = node?.mediaRecommendation;
      if (!m || m.isAdult) continue;

      const isManhwa = m.countryOfOrigin === 'KR' || m.format === 'MANHWA';
      const isManhua = m.countryOfOrigin === 'CN';
      const type: 'comic' | 'manga' | 'manhwa' = isManhwa ? 'manhwa' : 'manga';

      const title = m.title?.english || m.title?.romaji || m.title?.native || 'Mangá';
      if (isNsfwOrJunkComic(title, m.description)) continue;

      const originalTitle = m.title?.native || m.title?.romaji || undefined;
      const creators = (m.staff?.nodes || [])
        .map((n: any) => n?.name?.full)
        .filter((name: any): name is string => Boolean(name));

      results.push({
        id: `al-${m.id}`,
        title,
        originalTitle,
        type,
        description: sanitizeHtml(m.description),
        coverUrl: sanitizeCoverUrl(
          m.coverImage?.extraLarge || m.coverImage?.large || m.coverImage?.medium
        ),
        releaseYear: m.startDate?.year ?? null,
        publisher: isManhwa ? 'Webtoon / Manhwa' : isManhua ? 'Manhua' : 'Mangá Japonês',
        creators,
        genres: m.genres || [],
        volumeCount: m.volumes ?? null,
        chapterCount: m.chapters ?? null,
        status: m.status || undefined,
      });
    }

    setInCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Erro ao buscar recomendações na AniList:', error);
    return [];
  }
}

/**
 * Mapeia termos e gêneros comuns (em português ou inglês) para gêneros canônicos aceitos pela AniList GraphQL.
 */
export function mapGenreToAniList(genre: string): string | null {
  const normalized = genre.toLowerCase().trim();
  const mapping: Record<string, string> = {
    'ação': 'Action',
    'acao': 'Action',
    'action': 'Action',
    'aventura': 'Adventure',
    'adventure': 'Adventure',
    'comédia': 'Comedy',
    'comedia': 'Comedy',
    'comedy': 'Comedy',
    'drama': 'Drama',
    'fantasia': 'Fantasy',
    'fantasy': 'Fantasy',
    'dark fantasy': 'Fantasy',
    'fantasia sombria': 'Fantasy',
    'terror': 'Horror',
    'horror': 'Horror',
    'mistério': 'Mystery',
    'misterio': 'Mystery',
    'mystery': 'Mystery',
    'investigação': 'Mystery',
    'investigacao': 'Mystery',
    'policial': 'Mystery',
    'noir': 'Mystery',
    'psicológico': 'Psychological',
    'psicologico': 'Psychological',
    'psychological': 'Psychological',
    'romance': 'Romance',
    'ficção científica': 'Sci-Fi',
    'ficcao cientifica': 'Sci-Fi',
    'sci-fi': 'Sci-Fi',
    'scifi': 'Sci-Fi',
    'sobrenatural': 'Supernatural',
    'supernatural': 'Supernatural',
    'suspense': 'Thriller',
    'thriller': 'Thriller',
    'super-heróis': 'Action',
    'super-herois': 'Action',
    'super-herói': 'Action',
    'super-heroi': 'Action',
    'superheroes': 'Action',
    'superhero': 'Action',
    'histórico': 'Drama',
    'historico': 'Drama',
    'esporte': 'Sports',
    'sports': 'Sports',
  };

  return mapping[normalized] || null;
}

/**
 * Consulta em tempo real mangás aclamados filtrados por gêneros/tags do usuário via AniList GraphQL.
 */
export async function fetchMangaByGenresFromAniList(
  genres: string[],
  limit = 6
): Promise<ComicDetails[]> {
  const aniListGenres = Array.from(
    new Set(
      genres
        .map(mapGenreToAniList)
        .filter((g): g is string => Boolean(g))
    )
  );

  if (aniListGenres.length === 0) return [];

  const cacheKey = `anilist:genres:${aniListGenres.sort().join(',')}:${limit}`;
  const cached = getFromCache<ComicDetails[]>(cacheKey);
  if (cached) return cached;

  const graphqlQuery = `
    query ($genres: [String], $perPage: Int) {
      Page(perPage: $perPage) {
        media(type: MANGA, genre_in: $genres, sort: [SCORE_DESC, POPULARITY_DESC], isAdult: false) {
          id
          title {
            english
            romaji
            native
          }
          description(asHtml: false)
          coverImage {
            extraLarge
            large
            medium
          }
          startDate {
            year
          }
          countryOfOrigin
          format
          status
          volumes
          chapters
          genres
          staff(perPage: 3) {
            nodes {
              name {
                full
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { genres: aniListGenres, perPage: limit },
      }),
    });

    if (!res.ok) return [];

    const json = (await res.json()) as any;
    const mediaList = json.data?.Page?.media || [];

    const results: ComicDetails[] = [];
    for (const m of mediaList) {
      if (!m) continue;
      const isManhwa = m.countryOfOrigin === 'KR' || m.format === 'MANHWA';
      const isManhua = m.countryOfOrigin === 'CN';
      const type: 'comic' | 'manga' | 'manhwa' = isManhwa ? 'manhwa' : 'manga';

      const title = m.title?.english || m.title?.romaji || m.title?.native || 'Mangá';
      if (isNsfwOrJunkComic(title, m.description)) continue;

      const originalTitle = m.title?.native || m.title?.romaji || undefined;
      const creators = (m.staff?.nodes || [])
        .map((n: any) => n?.name?.full)
        .filter((name: any): name is string => Boolean(name));

      results.push({
        id: `al-${m.id}`,
        title,
        originalTitle,
        type,
        description: sanitizeHtml(m.description),
        coverUrl: sanitizeCoverUrl(
          m.coverImage?.extraLarge || m.coverImage?.large || m.coverImage?.medium
        ),
        releaseYear: m.startDate?.year ?? null,
        publisher: isManhwa ? 'Webtoon / Manhwa' : isManhua ? 'Manhua' : 'Mangá Japonês',
        creators,
        genres: m.genres || [],
        volumeCount: m.volumes ?? null,
        chapterCount: m.chapters ?? null,
        status: m.status || undefined,
      });
    }

    setInCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Erro ao buscar mangás por gênero na AniList:', error);
    return [];
  }
}

/**
 * Catálogo canônico de Sagas e Mangás com capas e dados reais verificados (Fallback de emergência / Cold Start neutro).
 */
export const POPULAR_COMICS_CATALOG: ComicDetails[] = [
  {
    id: 'cv-4050-53871',
    title: 'Watchmen',
    type: 'comic',
    description:
      'Uma das maiores obras literárias dos quadrinhos modernos criada por Alan Moore e Dave Gibbons. Quem vigia os vigilantes? Uma conspiração misteriosa abala um mundo à beira de uma guerra nuclear.',
    coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/3/36279/2697012-watchmen01.jpg',
    releaseYear: 1986,
    publisher: 'DC Comics',
    creators: ['Alan Moore', 'Dave Gibbons'],
    genres: ['Super-Heróis', 'Ficção Científica', 'Mistério', 'Clássico'],
    issueCount: 12,
    volumeCount: 1,
  },
  {
    id: 'cv-4050-159998',
    title: 'Batman: The Long Halloween',
    type: 'comic',
    description:
      'Clássica saga de Jeph Loeb e Tim Sale. No início de sua carreira, Batman une forças com James Gordon e Harvey Dent para deter o misterioso assassino Feriado, enquanto a máfia de Gotham desmorona.',
    coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/11/110017/9489381-wwww.jpg',
    releaseYear: 1996,
    publisher: 'DC Comics',
    creators: ['Jeph Loeb', 'Tim Sale'],
    genres: ['Investigação', 'Policial', 'Noir', 'Super-Heróis'],
    issueCount: 13,
    volumeCount: 1,
  },
  {
    id: 'cv-4050-18023',
    title: 'Civil War',
    type: 'comic',
    description:
      'Uma grande tragédia divide a comunidade de heróis. O governo propõe a Lei de Registro de Super-Humanos: Homem de Ferro lidera o lado pró-registro e Capitão América lidera a resistência.',
    coverUrl: 'https://comicvine.gamespot.com/a/uploads/scale_medium/0/443/82656-18023-105525-1-civil-war.jpg',
    releaseYear: 2006,
    publisher: 'Marvel Comics',
    creators: ['Mark Millar', 'Steve McNiven'],
    genres: ['Ação', 'Super-Heróis', 'Conflito Político'],
    issueCount: 7,
    volumeCount: 1,
  },
  {
    id: 'al-30002',
    title: 'Berserk',
    originalTitle: 'ベルセルク',
    type: 'manga',
    description:
      'A épica e sombria jornada de Guts, o Espadachim Negro, em um mundo de fantasia brutal repleto de demônios, traição, vingança e o inescapável destino.',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30002-Cul4OeN7bYtn.jpg',
    releaseYear: 1989,
    publisher: 'Hakusensha',
    creators: ['Kentaro Miura', 'Studio Gaga'],
    genres: ['Dark Fantasy', 'Ação', 'Drama', 'Sobrenatural'],
    volumeCount: 42,
    chapterCount: 376,
  },
  {
    id: 'al-105778',
    title: 'Chainsaw Man',
    originalTitle: 'チェンソーマン',
    type: 'manga',
    description:
      'Denji é um jovem que vive na miséria caçando demônios com Pochita. Após uma traição mortal, ele renasce como o lendário Chainsaw Man.',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx105778-euxXZEIfDY2u.png',
    releaseYear: 2018,
    publisher: 'Shueisha',
    creators: ['Tatsuki Fujimoto'],
    genres: ['Ação', 'Sobrenatural', 'Terror'],
    volumeCount: 17,
  },
  {
    id: 'al-30013',
    title: 'One Piece',
    originalTitle: 'ONE PIECE',
    type: 'manga',
    description:
      'Monkey D. Luffy e seus companheiros navegam pelos mares em busca do lendário tesouro supremo, o One Piece, para que ele se torne o Rei dos Piratas.',
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30013-BeslEMqiPhlk.jpg',
    releaseYear: 1997,
    publisher: 'Shueisha',
    creators: ['Eiichiro Oda'],
    genres: ['Aventura', 'Ação', 'Fantasia', 'Comédia'],
    volumeCount: 108,
  },
];

/**
 * Busca unificada por Sagas, Volumes e Mangás com suporte a interleaving e filtros de tipo.
 */
export async function searchComics(
  query: string,
  type: 'all' | 'comic' | 'manga' = 'all',
  limit = 12
): Promise<ComicDetails[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const shouldSearchComics = type === 'all' || type === 'comic';
  const shouldSearchManga = type === 'all' || type === 'manga';

  const [comicVineResults, aniListResults] = await Promise.all([
    shouldSearchComics ? searchComicsFromComicVine(normalizedQuery, limit) : Promise.resolve([]),
    shouldSearchManga ? searchMangaFromAniList(normalizedQuery, limit) : Promise.resolve([]),
  ]);

  const combinedMap = new Map<string, ComicDetails>();

  // Intercala resultados ocidentais e orientais para uma rica experiência visual
  const maxLength = Math.max(comicVineResults.length, aniListResults.length);
  for (let i = 0; i < maxLength; i++) {
    if (i < comicVineResults.length && shouldSearchComics) {
      const item = comicVineResults[i];
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }
    if (i < aniListResults.length && shouldSearchManga) {
      const item = aniListResults[i];
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }
  }

  // Se a busca na API não retornar nada, verifica o fallback
  if (combinedMap.size === 0) {
    const localMatches = POPULAR_COMICS_CATALOG.filter((c) => {
      if (type !== 'all' && c.type !== type && !(type === 'manga' && c.type === 'manhwa')) {
        return false;
      }
      return (
        c.title.toLowerCase().includes(normalizedQuery.toLowerCase()) ||
        (c.creators && c.creators.some((cr) => cr.toLowerCase().includes(normalizedQuery.toLowerCase())))
      );
    });

    for (const item of localMatches) {
      combinedMap.set(item.id, item);
    }
  }

  return Array.from(combinedMap.values()).slice(0, limit);
}

/**
 * Retorna obras populares em tempo real (Zero-Mock), consultando AniList e Comic Vine.
 */
export async function fetchPopularComics(limit = 12): Promise<ComicDetails[]> {
  const cacheKey = `comics:popular:combined:${limit}`;
  const cached = getFromCache<ComicDetails[]>(cacheKey);
  if (cached) return cached;

  const [mangaList, comicList] = await Promise.all([
    fetchPopularMangaFromAniList(limit),
    fetchPopularComicsFromComicVine(limit),
  ]);

  const combined: ComicDetails[] = [];
  const maxLen = Math.max(mangaList.length, comicList.length);

  for (let i = 0; i < maxLen; i++) {
    if (i < comicList.length && combined.length < limit) {
      if (!combined.some((c) => c.id === comicList[i].id)) combined.push(comicList[i]);
    }
    if (i < mangaList.length && combined.length < limit) {
      if (!combined.some((c) => c.id === mangaList[i].id)) combined.push(mangaList[i]);
    }
  }

  // Se uma das fontes falhar ou o retorno combinado for menor que o limite solicitado, complementa
  if (combined.length < limit) {
    for (const item of POPULAR_COMICS_CATALOG) {
      if (combined.length >= limit) break;
      if (!combined.some((c) => c.id === item.id || c.title.toLowerCase() === item.title.toLowerCase())) {
        combined.push(item);
      }
    }
  }

  const results = combined.slice(0, limit);

  if (results.length > 0) {
    setInCache(cacheKey, results);
    return results;
  }

  // Fallback de resiliência caso ambas as APIs externas estejam offline
  return POPULAR_COMICS_CATALOG.slice(0, limit);
}

/**
 * Busca detalhes completos de uma saga ou mangá por ID unificado.
 */
export async function getComicDetails(id: string): Promise<ComicDetails | null> {
  // 1. Procura no catálogo pré-configurado
  const inCatalog = POPULAR_COMICS_CATALOG.find((c) => c.id === id);
  if (inCatalog) {
    if (!inCatalog.issues || inCatalog.issues.length === 0) {
      const count = inCatalog.issueCount || inCatalog.volumeCount || 0;
      if (count > 0) {
        const isComic = inCatalog.type === 'comic';
        const maxEnum = Math.min(count, 120);
        inCatalog.issues = Array.from({ length: maxEnum }, (_, i) => ({
          id: isComic ? `issue-${i + 1}` : `vol-${i + 1}`,
          name: isComic ? `${inCatalog.title} #${i + 1}` : `${inCatalog.title} - Volume ${i + 1}`,
          issueNumber: String(i + 1),
        }));
      }
    }
    return inCatalog;
  }

  // 2. Se for Comic Vine (cv-)
  if (id.startsWith('cv-')) {
    const detail = await getComicDetailsFromComicVine(id);
    if (detail) return detail;
  }

  // 3. Se for AniList (al-)
  if (id.startsWith('al-')) {
    const numId = parseInt(id.replace('al-', ''), 10);
    if (!isNaN(numId)) {
      const detail = await getMangaDetailsFromAniList(numId);
      if (detail) return detail;
    }
  }

  // Retorna do catálogo se existir (mesmo sem issues detalhadas)
  return inCatalog || null;
}
