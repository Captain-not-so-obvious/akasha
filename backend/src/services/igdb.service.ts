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
  rating?: number; // Pontuação crítica 0-100
  similarGameIds?: string[];
}

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedTwitchToken: { token: string; expiresAt: number } | null = null;

export function _clearTwitchTokenCacheForTesting(): void {
  cachedTwitchToken = null;
}

/**
 * Categorias não-jogos comuns na Twitch Helix que devem ser filtradas
 * para que o motor recomende estritamente jogos reais.
 */
const NON_GAME_CATEGORIES = new Set([
  'just chatting',
  'irl',
  'special events',
  'slots',
  'art',
  'music',
  'always on',
  'talk shows & podcasts',
  'casino',
  'virtual casino',
  'sports',
  'pools, hot tubs, and beaches',
  'software and game development',
  'retro',
]);

/**
 * Obtém ou renova token de acesso OAuth com a Twitch API para chamadas ao IGDB e Twitch Helix.
 */
async function getTwitchAccessToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID || process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET || process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const now = Date.now();
  if (cachedTwitchToken && cachedTwitchToken.expiresAt > now + 60000) {
    return cachedTwitchToken.token;
  }

  try {
    const url = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
    const response = await fetch(url, { method: 'POST' });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as TwitchTokenResponse;
    cachedTwitchToken = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return cachedTwitchToken.token;
  } catch {
    return null;
  }
}

/**
 * Busca os jogos que estão atualmente em alta / tendência na Twitch (Twitch Helix Top Games)
 * e enriquece os metadados oficiais com a IGDB API em tempo real.
 */
export async function fetchTwitchTrendingGames(limit = 10): Promise<GameDetails[]> {
  const isProduction = process.env.NODE_ENV === 'production';
  const token = await getTwitchAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID || process.env.IGDB_CLIENT_ID;

  if (!token || !clientId) {
    if (isProduction) {
      console.error('[IGDB/Twitch] Credenciais da Twitch ausentes em produção.');
    }
    return [];
  }

  try {
    // 1. Consulta os jogos mais assistidos e em alta na Twitch Helix API
    const twitchLimit = Math.min(Math.max(limit * 2, 20), 100);
    const twitchRes = await fetch(`https://api.twitch.tv/helix/games/top?first=${twitchLimit}`, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!twitchRes.ok) {
      console.error(`[Twitch Helix] Erro ao consultar top games: ${twitchRes.status}`);
      return [];
    }

    const twitchData = (await twitchRes.json()) as {
      data?: Array<{
        id: string;
        name: string;
        box_art_url: string;
        igdb_id?: string;
      }>;
    };

    if (!twitchData.data || !Array.isArray(twitchData.data)) {
      return [];
    }

    // 2. Filtra categorias que não são jogos reais (Just Chatting, Slots, IRL, etc.)
    const validTwitchItems = twitchData.data.filter((item) => {
      const lower = item.name.toLowerCase().trim();
      return !NON_GAME_CATEGORIES.has(lower);
    });

    // 3. Extrai IDs do IGDB mapeados pela Twitch
    const igdbIds = validTwitchItems
      .map((item) => item.igdb_id)
      .filter((id): id is string => Boolean(id && id.trim() !== ''));

    if (igdbIds.length > 0) {
      // 4. Consulta a IGDB API em lote para trazer capas, sinopses, gêneros e notas oficiais
      const igdbQuery = `
        where id = (${igdbIds.join(',')}) & cover != null;
        fields id, name, slug, summary, cover.url, screenshots.url, first_release_date, genres.name, platforms.name, total_rating, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, similar_games;
        limit ${igdbIds.length};
      `;

      const igdbRes = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: igdbQuery,
      });

      if (igdbRes.ok) {
        const rawGames = (await igdbRes.json()) as Array<{
          id: number;
          name: string;
          slug?: string;
          summary?: string;
          cover?: { url?: string };
          screenshots?: Array<{ url?: string }>;
          first_release_date?: number;
          genres?: Array<{ name: string }>;
          platforms?: Array<{ name: string }>;
          total_rating?: number;
          similar_games?: number[];
        }>;

        if (Array.isArray(rawGames) && rawGames.length > 0) {
          const igdbMap = new Map<string, GameDetails>();
          for (const g of rawGames) {
            igdbMap.set(String(g.id), {
              id: String(g.id),
              title: g.name,
              slug: g.slug,
              summary: g.summary,
              coverUrl: g.cover?.url
                ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}`
                : null,
              backdropUrl: g.screenshots?.[0]?.url
                ? `https:${g.screenshots[0].url.replace('t_thumb', 't_screenshot_big')}`
                : null,
              releaseYear: g.first_release_date
                ? new Date(g.first_release_date * 1000).getFullYear()
                : null,
              genres: g.genres?.map((item) => item.name) || [],
              platforms: g.platforms?.map((item) => item.name) || [],
              rating: g.total_rating ? Math.round(g.total_rating) : undefined,
              similarGameIds: g.similar_games?.map(String) || [],
            });
          }

          // Mantém rigorosamente a ordem de tendência da Twitch
          const orderedGames: GameDetails[] = [];
          for (const twitchItem of validTwitchItems) {
            if (twitchItem.igdb_id && igdbMap.has(twitchItem.igdb_id)) {
              orderedGames.push(igdbMap.get(twitchItem.igdb_id)!);
            }
            if (orderedGames.length >= limit) break;
          }

          if (orderedGames.length > 0) {
            return orderedGames;
          }
        }
      }
    }

    // 5. Fallback dinâmico: se a IGDB estiver inacessível, mas a Twitch Helix respondeu
    return validTwitchItems.slice(0, limit).map((item) => ({
      id: item.igdb_id || item.id,
      title: item.name,
      coverUrl: item.box_art_url.replace('{width}x{height}', '600x800'),
      backdropUrl: null,
      releaseYear: null,
      genres: ['Tendência Twitch'],
      platforms: [],
      rating: undefined,
      similarGameIds: [],
    }));
  } catch (err) {
    console.error('[Twitch/IGDB] Erro ao buscar tendências na Twitch:', err);
    return [];
  }
}

/**
 * Retorna jogos populares/tendências para o motor de recomendação e catálogo geral.
 * Integra-se diretamente à Twitch Helix API (Trending Games).
 */
export async function fetchPopularGames(limit = 10): Promise<GameDetails[]> {
  return fetchTwitchTrendingGames(limit);
}

/**
 * Realiza busca textual de jogos no catálogo oficial do IGDB.
 * Se a query for vazia, retorna os jogos em tendência na Twitch.
 */
export async function searchGames(query: string, limit = 10): Promise<GameDetails[]> {
  const isProduction = process.env.NODE_ENV === 'production';
  const token = await getTwitchAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID || process.env.IGDB_CLIENT_ID;

  const normalizedQuery = query.toLowerCase().trim();

  // Se não foi fornecido termo de busca, exibe as tendências ao vivo da Twitch
  if (!normalizedQuery) {
    return fetchTwitchTrendingGames(limit);
  }

  if (token && clientId) {
    try {
      const igdbQuery = `
        search "${query.replace(/"/g, '')}";
        fields id, name, slug, summary, cover.url, screenshots.url, first_release_date, genres.name, platforms.name, total_rating, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, similar_games;
        limit ${limit};
      `;

      const res = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: igdbQuery,
      });

      if (res.ok) {
        const rawGames = (await res.json()) as unknown;

        if (Array.isArray(rawGames)) {
          return rawGames.map((g) => ({
            id: String(g.id),
            title: g.name,
            slug: g.slug,
            summary: g.summary,
            coverUrl: g.cover?.url
              ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}`
              : null,
            backdropUrl: g.screenshots?.[0]?.url
              ? `https:${g.screenshots[0].url.replace('t_thumb', 't_screenshot_big')}`
              : null,
            releaseYear: g.first_release_date
              ? new Date(g.first_release_date * 1000).getFullYear()
              : null,
            genres: g.genres?.map((item: { name: string }) => item.name) || [],
            platforms: g.platforms?.map((item: { name: string }) => item.name) || [],
            rating: g.total_rating ? Math.round(g.total_rating) : undefined,
            similarGameIds: g.similar_games?.map(String) || [],
          }));
        }
      }
    } catch (err) {
      console.error('[IGDB] Falha ao consultar API oficial da IGDB:', err);
      return [];
    }
  }

  if (isProduction && (!token || !clientId)) {
    console.error('[IGDB] Credenciais TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET ausentes em produção.');
  }

  return [];
}

/**
 * Busca detalhes completos de um jogo pelo ID externo da IGDB.
 */
export async function fetchGameDetails(gameId: string): Promise<GameDetails | null> {
  const token = await getTwitchAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID || process.env.IGDB_CLIENT_ID;

  if (token && clientId) {
    try {
      const igdbQuery = `
        where id = ${gameId};
        fields id, name, slug, summary, cover.url, screenshots.url, first_release_date, genres.name, platforms.name, total_rating, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, similar_games;
      `;

      const res = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: igdbQuery,
      });

      if (res.ok) {
        const rawGames = (await res.json()) as Array<{
          id: number;
          name: string;
          slug?: string;
          summary?: string;
          cover?: { url?: string };
          screenshots?: Array<{ url?: string }>;
          first_release_date?: number;
          genres?: Array<{ name: string }>;
          platforms?: Array<{ name: string }>;
          total_rating?: number;
          similar_games?: number[];
        }>;

        if (rawGames.length > 0) {
          const g = rawGames[0];
          return {
            id: String(g.id),
            title: g.name,
            slug: g.slug,
            summary: g.summary,
            coverUrl: g.cover?.url
              ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}`
              : null,
            backdropUrl: g.screenshots?.[0]?.url
              ? `https:${g.screenshots[0].url.replace('t_thumb', 't_screenshot_big')}`
              : null,
            releaseYear: g.first_release_date
              ? new Date(g.first_release_date * 1000).getFullYear()
              : null,
            genres: g.genres?.map((item) => item.name) || [],
            platforms: g.platforms?.map((item) => item.name) || [],
            rating: g.total_rating ? Math.round(g.total_rating) : undefined,
            similarGameIds: g.similar_games?.map(String) || [],
          };
        }
      }
    } catch (err) {
      console.error('[IGDB] Erro ao buscar detalhes na API oficial da IGDB:', err);
      return null;
    }
  }

  return null;
}

/**
 * Retorna jogos similares a partir do ID de um jogo consultando a API oficial da IGDB.
 */
export async function fetchSimilarGames(gameId: string, limit = 6): Promise<GameDetails[]> {
  const game = await fetchGameDetails(gameId);
  if (!game) {
    return [];
  }

  const token = await getTwitchAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID || process.env.IGDB_CLIENT_ID;

  if (token && clientId && game.similarGameIds && game.similarGameIds.length > 0) {
    try {
      const ids = game.similarGameIds.slice(0, limit + 4).join(',');
      const igdbQuery = `
        where id = (${ids}) & cover != null;
        fields id, name, slug, summary, cover.url, screenshots.url, first_release_date, genres.name, platforms.name, total_rating;
        limit ${limit};
      `;

      const res = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
        body: igdbQuery,
      });

      if (res.ok) {
        const rawGames = (await res.json()) as Array<{
          id: number;
          name: string;
          slug?: string;
          summary?: string;
          cover?: { url?: string };
          screenshots?: Array<{ url?: string }>;
          first_release_date?: number;
          genres?: Array<{ name: string }>;
          platforms?: Array<{ name: string }>;
          total_rating?: number;
        }>;

        if (rawGames.length > 0) {
          return rawGames.map((g) => ({
            id: String(g.id),
            title: g.name,
            slug: g.slug,
            summary: g.summary,
            coverUrl: g.cover?.url
              ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}`
              : null,
            backdropUrl: g.screenshots?.[0]?.url
              ? `https:${g.screenshots[0].url.replace('t_thumb', 't_screenshot_big')}`
              : null,
            releaseYear: g.first_release_date
              ? new Date(g.first_release_date * 1000).getFullYear()
              : null,
            genres: g.genres?.map((item) => item.name) || [],
            platforms: g.platforms?.map((item) => item.name) || [],
            rating: g.total_rating ? Math.round(g.total_rating) : undefined,
            similarGameIds: [],
          }));
        }
      }
    } catch (err) {
      console.error('[IGDB] Erro ao buscar jogos similares na API oficial da IGDB:', err);
      return [];
    }
  }

  return [];
}
