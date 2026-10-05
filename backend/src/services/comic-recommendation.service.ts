import { prisma } from '../lib/prisma.js';
import { DomainType } from '@prisma/client';
import {
  searchComics,
  fetchPopularComics,
  fetchMangaRecommendationsFromAniList,
  fetchMangaByGenresFromAniList,
  ComicDetails,
  isNsfwOrJunkComic,
  POPULAR_COMICS_CATALOG,
} from './comics.service.js';

export interface ComicRecommendationItem {
  id: string; // externalId (ex: cv-4050-3622 ou al-30002)
  title: string;
  type: 'comic' | 'manga' | 'manhwa';
  coverUrl: string | null;
  releaseYear: number | null;
  publisher?: string;
  creators: string[];
  genres: string[];
  volumeCount?: number | null;
  issueCount?: number | null;
  score: number;
  reason: string;
  description?: string;
}

export interface UserComicItem {
  externalId: string;
  title: string;
  userRating: number | null;
  status: string;
  extraMeta?: Record<string, unknown> | null;
}

export interface UserComicProfile {
  tagScores: Map<string, number>;
  positiveTags: { tag: string; score: number }[];
  negativeTags: Set<string>;
  favoritePublishers: Map<string, number>;
  favoriteCreators: Map<string, number>;
  totalPositiveWeight: number;
}

/**
 * Termos genéricos ou de formato que NUNCA devem ser tratados como termos de busca ou gêneros afins.
 */
export const IGNORED_GENRE_TERMS = new Set([
  'quadrinhos',
  'hq',
  'hq ocidental',
  'comics',
  'comic',
  'manga',
  'mangá',
  'manhwa',
  'manhua',
  'graphic novel',
  'livro',
  'volume',
  'issue',
  'tiras',
  'webtoon',
]);

/**
 * Normaliza título para comparações de deduplicação semântica.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza tag ou gênero para indexação uniforme preservando caracteres Unicode.
 */
export function normalizeGenre(genre: string): string {
  return genre
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();
}

/**
 * Extrai o núcleo/radical da franquia ou saga de forma agnóstica e puramente dinâmica via NLP.
 * Ex: "Batman: The Killing Joke" -> "Batman"
 * Ex: "Spider-Man: Blue" -> "Spider-Man"
 * Ex: "Civil War II" -> "Civil War"
 * Ex: "Saga Vol. 1" -> "Saga"
 */
export function extractSeriesCore(title: string): string {
  let cleaned = title.trim();

  // 1. Remove anos entre parênteses: ex: "(2003)" ou "(1986)"
  cleaned = cleaned.replace(/\(\s*\d{4}\s*\)/g, '').trim();

  // 2. Quebra nos delimitadores clássicos de subtítulo/saga (: – — / | ou hífen cercado por espaços " - ")
  // Preserva palavras com hífen interno como Spider-Man e X-Men
  const separatorMatch = cleaned.split(/\s*[:\–\—\/\|]\s*|\s+-\s+/);
  if (separatorMatch.length > 1 && separatorMatch[0].trim().length >= 3) {
    cleaned = separatorMatch[0].trim();
  }

  // 3. Remove termos de volume / edição / livro / compendium / parte
  cleaned = cleaned
    .replace(
      /\b(vol(ume|\.)?|book|livro|ed(ição|\.)?|issue|part(e)?|compendium|chapter|capítulo)\b.*$/i,
      ''
    )
    .trim();

  // 4. Remove numerais romanos ou arábicos isolados no final (ex: "Civil War II" -> "Civil War")
  cleaned = cleaned.replace(/\s+([0-9]+|[IVXLCDM]+)$/i, '').trim();

  // 5. Remove pontuações residuais nas bordas
  cleaned = cleaned.replace(/^[\s,.:;!?-]+|[\s,.:;!?-]+$/g, '').trim();

  return cleaned.length >= 2 ? cleaned : title.trim();
}

/**
 * Calcula o peso de afinidade de uma HQ ou Mangá da biblioteca do usuário.
 */
export function calculateComicWeight(item: UserComicItem): number {
  if (item.status === 'dropped') {
    return -3.0;
  }

  let ratingWeight = 1.0;
  if (item.userRating === 5) {
    ratingWeight = 3.0;
  } else if (item.userRating === 4) {
    ratingWeight = 2.0;
  } else if (item.userRating === 3) {
    ratingWeight = 1.0;
  } else if (item.userRating === 2) {
    ratingWeight = -1.0;
  } else if (item.userRating === 1) {
    ratingWeight = -2.0;
  }

  let statusMultiplier = 1.0;
  switch (item.status) {
    case 'completed':
      statusMultiplier = 1.5; // Lido
      break;
    case 'watching':
      statusMultiplier = 1.2; // Lendo
      break;
    case 'plan_to_watch':
      statusMultiplier = 1.0; // Quero Ler
      break;
  }

  return ratingWeight * statusMultiplier;
}

/**
 * Constrói o perfil vetorial de afinidade do usuário (tags/gêneros, criadores e editoras).
 * Mapeia tanto interesses positivos (4★, 5★) quanto aversões (1★, 2★, dropped).
 */
export function buildUserComicProfile(items: UserComicItem[]): UserComicProfile {
  const tagScores = new Map<string, number>();
  const favoritePublishers = new Map<string, number>();
  const favoriteCreators = new Map<string, number>();
  let totalPositiveWeight = 0;

  for (const item of items) {
    const weight = calculateComicWeight(item);
    if (weight > 0) {
      totalPositiveWeight += weight;
    }

    // Extrai e pontua gêneros / tags da obra
    const rawGenres = Array.isArray(item.extraMeta?.genres)
      ? (item.extraMeta?.genres as unknown[]).filter((g): g is string => typeof g === 'string')
      : [];

    for (const g of rawGenres) {
      const norm = normalizeGenre(g);
      if (!norm || IGNORED_GENRE_TERMS.has(norm)) continue;
      tagScores.set(norm, (tagScores.get(norm) || 0) + weight);
    }

    // Extrai e pontua editora
    const rawPublisher =
      typeof item.extraMeta?.publisher === 'string' ? item.extraMeta.publisher.trim() : null;
    if (rawPublisher && !IGNORED_GENRE_TERMS.has(rawPublisher.toLowerCase())) {
      const normPub = rawPublisher.toLowerCase();
      favoritePublishers.set(normPub, (favoritePublishers.get(normPub) || 0) + weight);
    }

    // Extrai e pontua criadores (roteiristas, ilustradores, mangakas)
    const rawCreators = Array.isArray(item.extraMeta?.creators)
      ? (item.extraMeta?.creators as unknown[]).filter((c): c is string => typeof c === 'string')
      : [];

    for (const c of rawCreators) {
      const normC = c.toLowerCase().trim();
      if (normC.length >= 3) {
        favoriteCreators.set(normC, (favoriteCreators.get(normC) || 0) + weight);
      }
    }
  }

  const positiveTags: { tag: string; score: number }[] = [];
  const negativeTags = new Set<string>();

  for (const [tag, score] of tagScores.entries()) {
    if (score > 0) {
      positiveTags.push({ tag, score });
    } else if (score < 0) {
      negativeTags.add(tag);
    }
  }

  // Ordena tags do usuário por peso de afinidade decrescente
  positiveTags.sort((a, b) => b.score - a.score);

  return {
    tagScores,
    positiveTags,
    negativeTags,
    favoritePublishers,
    favoriteCreators,
    totalPositiveWeight,
  };
}

/**
 * Calcula a probabilidade percentual de afinidade (% Match) e gera a justificativa humanizada
 * com base na sobreposição vetorial de tags, criadores, editoras e histórico de avaliações.
 */
export function calculateComicAffinity(
  candidate: ComicDetails,
  profile: UserComicProfile,
  options?: {
    seedTitle?: string;
    seedRating?: number | null;
    seedWeight?: number;
    matchType?: 'series_core' | 'creator' | 'collaborative' | 'tag' | 'canonical';
  }
): { score: number; reason: string } {
  const candidateGenres = (candidate.genres || []).filter(
    (g) => !IGNORED_GENRE_TERMS.has(g.toLowerCase().trim())
  );

  let tagScoreSum = 0;
  const matchedPositiveTags: string[] = [];
  let negativePenalty = 0;

  for (const g of candidateGenres) {
    const norm = normalizeGenre(g);
    const score = profile.tagScores.get(norm);
    if (score && score > 0) {
      tagScoreSum += score;
      matchedPositiveTags.push(g);
    } else if (profile.negativeTags.has(norm)) {
      negativePenalty += 8;
    }
  }

  // Base do score dinâmica por tipo de correlação
  let baseScore = 78;
  if (options?.seedRating && options.seedRating >= 5) {
    baseScore = 94;
  } else if (options?.seedRating === 4) {
    baseScore = 90;
  } else if (options?.seedRating === 3) {
    baseScore = 86;
  } else if (options?.matchType === 'collaborative') {
    baseScore = 91;
  } else if (options?.matchType === 'tag') {
    baseScore = 84;
  }

  // Bônus proporcional pela sobreposição das tags favoritas
  const tagBonus =
    profile.totalPositiveWeight > 0
      ? Math.min(8, Math.round((tagScoreSum / profile.totalPositiveWeight) * 8))
      : matchedPositiveTags.length > 0
      ? Math.min(6, matchedPositiveTags.length * 2)
      : 0;

  // Bônus se a obra for de um criador favorito do usuário
  let creatorBonus = 0;
  if (candidate.creators && candidate.creators.length > 0) {
    const hasFavCreator = candidate.creators.some((c) => {
      const score = profile.favoriteCreators.get(c.toLowerCase().trim());
      return score && score > 0;
    });
    if (hasFavCreator) {
      creatorBonus = 4;
    }
  }

  // Bônus se a obra for de uma editora favorita do usuário
  let publisherBonus = 0;
  if (candidate.publisher) {
    const score = profile.favoritePublishers.get(candidate.publisher.toLowerCase().trim());
    if (score && score > 0) {
      publisherBonus = 2;
    }
  }

  // Bônus se for continuação/saga correlata direta de uma obra 5 estrelas
  let seedTypeBonus = 0;
  if (options?.matchType === 'series_core' && options.seedRating && options.seedRating >= 5) {
    seedTypeBonus = 2;
  } else if (options?.matchType === 'collaborative' && options.seedRating && options.seedRating >= 5) {
    seedTypeBonus = 2;
  }

  const rawScore =
    baseScore + tagBonus + creatorBonus + publisherBonus + seedTypeBonus - negativePenalty;
  const finalScore = Math.max(65, Math.min(99, Math.round(rawScore)));

  // Construção textual rica e humanizada da justificativa
  let reason = '';
  if (options?.matchType === 'series_core' && options.seedTitle) {
    reason =
      options.seedRating && options.seedRating >= 4
        ? `Para quem avaliou ${options.seedTitle} com ${options.seedRating}★: saga correlata no mesmo universo`
        : `Expandindo o universo e sagas correlatas a ${options.seedTitle}`;
  } else if (options?.matchType === 'creator' && options.seedTitle) {
    const creatorName = candidate.creators?.[0] || 'mesmo autor';
    reason = `Do mesmo criador de ${options.seedTitle} (${creatorName})`;
  } else if (options?.matchType === 'collaborative' && options.seedTitle) {
    reason =
      options.seedRating && options.seedRating >= 4
        ? `Recomendado pela comunidade para quem curtiu ${options.seedTitle} (${options.seedRating}★)`
        : `Recomendado para fãs de ${options.seedTitle}`;
  } else if (matchedPositiveTags.length > 0) {
    const tagsDisplay = matchedPositiveTags.slice(0, 2).join(' e ');
    reason = `${finalScore}% de afinidade: combina com seu gosto por ${tagsDisplay}`;
  } else if (options?.seedTitle) {
    reason = `Recomendado com base no seu histórico em ${options.seedTitle}`;
  } else {
    reason = `Obra aclamada com alta relevância editorial no Akasha`;
  }

  return { score: finalScore, reason };
}

/**
 * Motor de Inteligência de Recomendações de Quadrinhos e Mangás 100% Dinâmico.
 * Executa Content-Based Tag Affinity & Graph Collaborative Filtering
 * sem listas estáticas, ponderando tags, criadores e notas reais do usuário.
 */
export async function getUserComicRecommendations(
  userId: string,
  options: { limit?: number } = {}
): Promise<ComicRecommendationItem[]> {
  const limit = options.limit ?? 10;

  // 1. Busca todo o histórico do usuário na wishlist com domain = 'comic'
  const wishlistItems = await prisma.wishlist.findMany({
    where: {
      userId,
      domain: DomainType.comic,
    },
  });

  const existingIds = new Set(wishlistItems.map((i) => i.externalId));
  const existingNormalizedTitles = new Set(
    wishlistItems.map((i) => normalizeTitle(i.title))
  );

  const userItems: UserComicItem[] = wishlistItems.map((item) => ({
    externalId: item.externalId,
    title: item.title,
    userRating: item.userRating,
    status: item.status,
    extraMeta: item.extraMeta as Record<string, unknown> | null,
  }));

  // Constrói o perfil vetorial de tags e afinidades do usuário
  const userProfile = buildUserComicProfile(userItems);

  // 2. Extrai itens positivos do usuário para servir de sementes diretas
  const positiveItems = userItems
    .map((item) => ({
      ...item,
      weight: calculateComicWeight(item),
    }))
    .filter((item) => item.weight > 0);

  // 3. Cold Start se o usuário não possuir avaliações positivas
  if (positiveItems.length === 0) {
    return getColdStartComicRecommendations(
      existingIds,
      existingNormalizedTitles,
      limit
    );
  }

  // Ordena por peso decrescente para priorizar as obras mais amadas
  positiveItems.sort((a, b) => b.weight - a.weight);

  const candidateMap = new Map<string, ComicRecommendationItem>();

  const addCandidate = (
    c: ComicDetails,
    affinity: { score: number; reason: string }
  ) => {
    const normTitle = normalizeTitle(c.title);
    if (
      existingIds.has(c.id) ||
      existingNormalizedTitles.has(normTitle) ||
      isNsfwOrJunkComic(c.title, c.description)
    ) {
      return;
    }

    const existing = candidateMap.get(c.id);
    if (!existing || existing.score < affinity.score) {
      candidateMap.set(c.id, {
        id: c.id,
        title: c.title,
        type: c.type,
        coverUrl: c.coverUrl,
        releaseYear: c.releaseYear,
        publisher: c.publisher,
        creators: c.creators,
        genres: (c.genres || []).filter(
          (g) => !IGNORED_GENRE_TERMS.has(g.toLowerCase().trim())
        ),
        volumeCount: c.volumeCount,
        issueCount: c.issueCount,
        score: affinity.score,
        reason: affinity.reason,
        description: c.description,
      });
    }
  };

  // 4. Executa a busca dinâmica baseada na biblioteca real
  const topSeeds = positiveItems.slice(0, 6);

  for (const seed of topSeeds) {
    const isManga = seed.externalId.startsWith('al-');
    const anilistId = isManga
      ? parseInt(seed.externalId.replace('al-', ''), 10)
      : null;

    // A. Mangás / Manhwas: Consulta o grafo colaborativo em tempo real da AniList
    if (anilistId && !isNaN(anilistId)) {
      try {
        const rawRecs = await fetchMangaRecommendationsFromAniList(anilistId, 6);
        const anilistRecs = Array.isArray(rawRecs) ? rawRecs : [];
        for (const rec of anilistRecs) {
          const affinity = calculateComicAffinity(rec, userProfile, {
            seedTitle: seed.title,
            seedRating: seed.userRating,
            seedWeight: seed.weight,
            matchType: 'collaborative',
          });
          addCandidate(rec, affinity);
        }
      } catch (err) {
        console.error('Erro na consulta dinâmica à AniList:', err);
      }
    }

    // B. Criadores e Autores Dinâmicos: Busca obras dos mesmos criadores
    const creators = Array.isArray(seed.extraMeta?.creators)
      ? (seed.extraMeta?.creators as string[])
      : [];

    const topCreators = creators.slice(0, 2);
    for (const creator of topCreators) {
      if (!creator || creator.trim().length < 3) continue;
      try {
        const rawCreatorMatches = await searchComics(creator.trim(), 'all', 4);
        const creatorMatches = Array.isArray(rawCreatorMatches) ? rawCreatorMatches : [];
        for (const match of creatorMatches) {
          const affinity = calculateComicAffinity(match, userProfile, {
            seedTitle: seed.title,
            seedRating: seed.userRating,
            seedWeight: seed.weight,
            matchType: 'creator',
          });
          addCandidate(match, affinity);
        }
      } catch (err) {
        console.error(`Erro na busca dinâmica de criador ${creator}:`, err);
      }
    }

    // C. Radical da Série / Franquia: Busca dinâmica por universos e sagas correlatas
    const seriesCore = extractSeriesCore(seed.title);
    if (seriesCore && seriesCore.length >= 3) {
      try {
        const rawSeriesMatches = await searchComics(seriesCore, 'all', 5);
        const seriesMatches = Array.isArray(rawSeriesMatches) ? rawSeriesMatches : [];
        for (const match of seriesMatches) {
          const normTitle = normalizeTitle(match.title);
          if (normTitle === normalizeTitle(seed.title)) continue;

          const affinity = calculateComicAffinity(match, userProfile, {
            seedTitle: seed.title,
            seedRating: seed.userRating,
            seedWeight: seed.weight,
            matchType: 'series_core',
          });
          addCandidate(match, affinity);
        }
      } catch (err) {
        console.error(`Erro na busca dinâmica por série ${seriesCore}:`, err);
      }
    }

    if (candidateMap.size >= limit * 2) {
      break;
    }
  }

  // 5. Ingestão Dinâmica Direta por Top Tags/Gêneros do Usuário (Content-Based)
  const topTags = userProfile.positiveTags.slice(0, 3).map((t) => t.tag);
  if (topTags.length > 0) {
    try {
      const rawTagMangas = await fetchMangaByGenresFromAniList(topTags, 6);
      const tagMangas = Array.isArray(rawTagMangas) ? rawTagMangas : [];
      for (const manga of tagMangas) {
        const affinity = calculateComicAffinity(manga, userProfile, {
          matchType: 'tag',
        });
        addCandidate(manga, affinity);
      }
    } catch (err) {
      console.error('Erro na busca de mangás por tags na AniList:', err);
    }
  }

  // 6. Se o total dinâmico for menor que o limite, complementa com catálogo avaliando afinidade real
  if (candidateMap.size < limit) {
    const canonicalPool = POPULAR_COMICS_CATALOG.filter(
      (c) =>
        !existingIds.has(c.id) &&
        !existingNormalizedTitles.has(normalizeTitle(c.title)) &&
        !isNsfwOrJunkComic(c.title, c.description)
    );

    for (const pop of canonicalPool) {
      if (candidateMap.size >= limit) break;
      if (!candidateMap.has(pop.id)) {
        const affinity = calculateComicAffinity(pop, userProfile, {
          matchType: 'canonical',
        });
        addCandidate(pop, affinity);
      }
    }
  }

  return Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Recomendações Cold Start para usuários novos ou sem avaliações positivas.
 */
export async function getColdStartComicRecommendations(
  existingIds: Set<string>,
  existingTitles: Set<string>,
  limit: number
): Promise<ComicRecommendationItem[]> {
  const canonicalPool = POPULAR_COMICS_CATALOG.filter(
    (c) =>
      !existingIds.has(c.id) &&
      !existingTitles.has(normalizeTitle(c.title)) &&
      !isNsfwOrJunkComic(c.title, c.description)
  );

  return canonicalPool.slice(0, limit).map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    coverUrl: c.coverUrl,
    releaseYear: c.releaseYear,
    publisher: c.publisher,
    creators: c.creators,
    genres: (c.genres || []).filter(
      (g) => !IGNORED_GENRE_TERMS.has(g.toLowerCase())
    ),
    volumeCount: c.volumeCount,
    issueCount: c.issueCount,
    score: 90,
    reason: 'Saga essencial e aclamada para iniciar suas leituras no Akasha',
    description: c.description,
  }));
}

