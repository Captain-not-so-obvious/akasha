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
 * Mapeia gêneros comuns em inglês para exibição elegante em português na justificativa.
 */
function formatGenreForDisplay(genre: string): string {
  const map: Record<string, string> = {
    action: 'Ação',
    adventure: 'Aventura',
    fantasy: 'Fantasia',
    drama: 'Drama',
    supernatural: 'Sobrenatural',
    mystery: 'Mistério',
    horror: 'Terror',
    'sci-fi': 'Ficção Científica',
    psychological: 'Suspense Psicológico',
    comedy: 'Comédia',
    sports: 'Esportes',
    thriller: 'Suspense',
    historical: 'Histórico',
  };
  return map[genre.toLowerCase().trim()] || genre;
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
    matchType?: 'series_core' | 'creator' | 'collaborative' | 'tag' | 'publisher_affinity' | 'canonical';
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
      negativePenalty += 12;
    }
  }

  // Base do score dinâmica por tipo de correlação
  let baseScore = 78;
  if (options?.seedRating && options.seedRating >= 5) {
    baseScore = 93;
  } else if (options?.seedRating === 4) {
    baseScore = 89;
  } else if (options?.seedRating === 3) {
    baseScore = 85;
  } else if (options?.matchType === 'collaborative') {
    baseScore = 91;
  } else if (options?.matchType === 'series_core') {
    baseScore = 90;
  } else if (options?.matchType === 'publisher_affinity') {
    baseScore = 88;
  } else if (options?.matchType === 'tag') {
    baseScore = 84;
  } else if (options?.matchType === 'canonical') {
    baseScore = 81;
  }

  // Bônus proporcional pela sobreposição das tags favoritas
  const tagBonus =
    profile.totalPositiveWeight > 0
      ? Math.min(6, Math.round((tagScoreSum / profile.totalPositiveWeight) * 6))
      : matchedPositiveTags.length > 0
      ? Math.min(5, matchedPositiveTags.length * 2)
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
      publisherBonus = 3;
    }
  }

  // Bônus se for continuação/saga correlata direta de uma obra 5 estrelas
  let seedTypeBonus = 0;
  if (options?.matchType === 'series_core' && options.seedRating && options.seedRating >= 5) {
    seedTypeBonus = 2;
  } else if (options?.matchType === 'collaborative' && options.seedRating && options.seedRating >= 5) {
    seedTypeBonus = 2;
  }

  // Variação determinística baseada no título para evitar scores chapados e idênticos
  const hashVariance = candidate.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 4;

  const rawScore =
    baseScore + tagBonus + creatorBonus + publisherBonus + seedTypeBonus + hashVariance - negativePenalty;
  const finalScore = Math.max(65, Math.min(99, Math.round(rawScore)));

  // Construção textual rica, variada e humanizada da justificativa
  let reason = '';
  if (options?.matchType === 'series_core' && options.seedTitle) {
    reason =
      options.seedRating && options.seedRating >= 4
        ? `Porque você avaliou ${options.seedTitle} com ${options.seedRating}★: arco e universo correlato`
        : `Saga que expande o universo e mitologia de ${options.seedTitle}`;
  } else if (options?.matchType === 'creator' && options.seedTitle) {
    const creatorName = candidate.creators?.[0] || 'mesmo autor';
    reason = `Do mesmo autor/mangaka de ${options.seedTitle} (${creatorName})`;
  } else if (options?.matchType === 'collaborative' && options.seedTitle) {
    reason =
      options.seedRating && options.seedRating >= 4
        ? `Recomendado pela comunidade para quem curtiu ${options.seedTitle} (${options.seedRating}★)`
        : `Alta afinidade temática e narrativa com ${options.seedTitle}`;
  } else if (options?.matchType === 'publisher_affinity' && candidate.publisher) {
    reason = `Clássico aclamado da ${candidate.publisher} com forte afinidade ao seu perfil`;
  } else if (matchedPositiveTags.length > 0) {
    const tagsDisplay = matchedPositiveTags
      .slice(0, 2)
      .map(formatGenreForDisplay)
      .join(' e ');
    reason = `${finalScore}% de afinidade: combina com seu apreço por ${tagsDisplay}`;
  } else if (options?.seedTitle) {
    reason = `Recomendado com base no seu histórico em ${options.seedTitle}`;
  } else if (candidate.publisher) {
    reason = `Marco editorial da ${candidate.publisher} no acervo do Akasha`;
  } else {
    reason = `Obra-prima aclamada com alta relevância editorial no Akasha`;
  }

  return { score: finalScore, reason };
}

/**
 * Motor de Inteligência de Recomendações de Quadrinhos e Mangás Dinâmico e Multidimensional.
 * Executa Content-Based Tag Affinity, Graph Collaborative Filtering, Diversificação de Sementes
 * e Interleaving Editorial sem estagnação, ponderando notas reais, editoras e universos correlatos.
 */
export async function getUserComicRecommendations(
  userId: string,
  options: { limit?: number; type?: 'all' | 'comic' | 'manga' } = {}
): Promise<ComicRecommendationItem[]> {
  const limit = options.limit ?? 12;
  const targetType = options.type ?? 'all';

  // 1. Busca todo o histórico do usuário na wishlist com domain = 'comic'
  const wishlistItems = await prisma.wishlist.findMany({
    where: {
      userId,
      domain: DomainType.comic,
    },
    orderBy: { updatedAt: 'desc' },
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
      limit,
      targetType
    );
  }

  // Ordena por peso decrescente para priorizar as obras mais amadas
  positiveItems.sort((a, b) => b.weight - a.weight);

  // 4. Diversificação de Sementes:
  // Agrupa e desduplica sementes por série / universo (seriesCore) para que múltiplas
  // edições da mesma saga (ex: vários volumes de Before Watchmen) não saturem todas as buscas.
  const seenCores = new Set<string>();
  const diversifiedItems: typeof positiveItems = [];
  for (const item of positiveItems) {
    const core = extractSeriesCore(item.title).toLowerCase();
    if (!seenCores.has(core)) {
      seenCores.add(core);
      diversifiedItems.push(item);
    }
  }

  // Seleciona as sementes de acordo com o filtro solicitado
  let seedItems: typeof positiveItems = [];
  if (targetType === 'comic') {
    const comicSeeds = diversifiedItems.filter((i) => !i.externalId.startsWith('al-'));
    seedItems = (comicSeeds.length > 0 ? comicSeeds : diversifiedItems).slice(0, 6);
  } else if (targetType === 'manga') {
    const mangaSeeds = diversifiedItems.filter((i) => i.externalId.startsWith('al-'));
    seedItems = (mangaSeeds.length > 0 ? mangaSeeds : diversifiedItems).slice(0, 6);
  } else {
    // 'all': balanceia sementes entre HQs ocidentais e Mangás para máxima riqueza transmídia
    const comicSeeds = diversifiedItems.filter((i) => !i.externalId.startsWith('al-')).slice(0, 4);
    const mangaSeeds = diversifiedItems.filter((i) => i.externalId.startsWith('al-')).slice(0, 4);
    seedItems = [...comicSeeds, ...mangaSeeds];
    if (seedItems.length === 0) {
      seedItems = diversifiedItems.slice(0, 8);
    }
  }

  const candidateMap = new Map<string, ComicRecommendationItem>();
  const candidateTitles = new Map<string, string>(); // normTitle -> id

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

    // Filtra pelo tipo de mídia se não for 'all'
    if (targetType === 'comic' && c.type !== 'comic') {
      return;
    }
    if (targetType === 'manga' && c.type === 'comic') {
      return;
    }

    const duplicateTitleId = candidateTitles.get(normTitle);
    if (duplicateTitleId && duplicateTitleId !== c.id) {
      const prev = candidateMap.get(duplicateTitleId);
      if (prev && prev.score >= affinity.score) {
        return; // Mantém a versão anterior com score maior ou igual
      }
      candidateMap.delete(duplicateTitleId);
    }

    const existing = candidateMap.get(c.id);
    if (!existing || existing.score < affinity.score) {
      candidateTitles.set(normTitle, c.id);
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

  // 5. Executa a busca dinâmica baseada na biblioteca real
  for (const seed of seedItems) {
    const isManga = seed.externalId.startsWith('al-');
    const anilistId = isManga
      ? parseInt(seed.externalId.replace('al-', ''), 10)
      : null;

    // A. Mangás / Manhwas: Consulta o grafo colaborativo em tempo real da AniList
    if (anilistId && !isNaN(anilistId) && targetType !== 'comic') {
      try {
        const rawRecs = await fetchMangaRecommendationsFromAniList(anilistId, 10);
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
        const rawCreatorMatches = await searchComics(creator.trim(), targetType, 4);
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
        const rawSeriesMatches = await searchComics(seriesCore, targetType, 5);
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

    if (candidateMap.size >= limit * 3) {
      break;
    }
  }

  // 6. Expansão por Editoras e Selos Favoritos (ex: DC Comics, Marvel, Vertigo, Image)
  if (targetType !== 'manga') {
    const topPublishers = Array.from(userProfile.favoritePublishers.entries())
      .filter(([pub, score]) => score > 0 && !IGNORED_GENRE_TERMS.has(pub))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([pub]) => pub);

    for (const pub of topPublishers) {
      const canonicalPublisherMatches = POPULAR_COMICS_CATALOG.filter(
        (c) =>
          c.type === 'comic' &&
          c.publisher?.toLowerCase().includes(pub) &&
          !existingIds.has(c.id) &&
          !existingNormalizedTitles.has(normalizeTitle(c.title)) &&
          !candidateMap.has(c.id)
      );

      for (const match of canonicalPublisherMatches) {
        const affinity = calculateComicAffinity(match, userProfile, {
          matchType: 'publisher_affinity',
        });
        addCandidate(match, affinity);
      }
    }
  }

  // 7. Ingestão Dinâmica Direta por Top Tags/Gêneros do Usuário (Content-Based)
  if (targetType !== 'comic') {
    const topTags = userProfile.positiveTags.slice(0, 3).map((t) => t.tag);
    if (topTags.length > 0) {
      try {
        for (const tag of topTags) {
          const rawTagMangas = await fetchMangaByGenresFromAniList([tag], 10);
          const tagMangas = Array.isArray(rawTagMangas) ? rawTagMangas : [];
          for (const manga of tagMangas) {
            const affinity = calculateComicAffinity(manga, userProfile, {
              matchType: 'tag',
            });
            addCandidate(manga, affinity);
          }
        }
      } catch (err) {
        console.error('Erro na busca de mangás por tags na AniList:', err);
      }
    }
  }

  // 8. Se o total for menor que o limite, complementa com catálogo canônico editorial
  if (candidateMap.size < limit) {
    const canonicalPool = POPULAR_COMICS_CATALOG.filter(
      (c) =>
        !existingIds.has(c.id) &&
        !existingNormalizedTitles.has(normalizeTitle(c.title)) &&
        !isNsfwOrJunkComic(c.title, c.description) &&
        (targetType === 'all' ||
          (targetType === 'comic' && c.type === 'comic') ||
          (targetType === 'manga' && c.type !== 'comic'))
    );

    for (const pop of canonicalPool) {
      if (candidateMap.size >= limit * 2) break;
      if (!candidateMap.has(pop.id)) {
        const affinity = calculateComicAffinity(pop, userProfile, {
          matchType: 'canonical',
        });
        addCandidate(pop, affinity);
      }
    }
  }

  // 9. Interleaving e Balanceamento:
  // Se targetType === 'all', intercala HQs ocidentais e Mangás para garantir um mix rico e diversificado
  const allCandidates = Array.from(candidateMap.values());
  let finalCandidates: ComicRecommendationItem[] = [];

  if (targetType === 'all') {
    const comicCandidates = allCandidates
      .filter((c) => c.type === 'comic')
      .sort((a, b) => b.score - a.score);

    const mangaCandidates = allCandidates
      .filter((c) => c.type === 'manga' || c.type === 'manhwa')
      .sort((a, b) => b.score - a.score);

    const maxLength = Math.max(comicCandidates.length, mangaCandidates.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < comicCandidates.length) finalCandidates.push(comicCandidates[i]);
      if (i < mangaCandidates.length) finalCandidates.push(mangaCandidates[i]);
    }

    if (finalCandidates.length === 0) {
      finalCandidates = allCandidates.sort((a, b) => b.score - a.score);
    }
  } else {
    finalCandidates = allCandidates.sort((a, b) => b.score - a.score);
  }

  return finalCandidates.slice(0, limit);
}

/**
 * Recomendações Cold Start para usuários novos ou sem avaliações positivas.
 */
export async function getColdStartComicRecommendations(
  existingIds: Set<string>,
  existingTitles: Set<string>,
  limit: number,
  targetType: 'all' | 'comic' | 'manga' = 'all'
): Promise<ComicRecommendationItem[]> {
  const canonicalPool = POPULAR_COMICS_CATALOG.filter(
    (c) =>
      !existingIds.has(c.id) &&
      !existingTitles.has(normalizeTitle(c.title)) &&
      !isNsfwOrJunkComic(c.title, c.description) &&
      (targetType === 'all' ||
        (targetType === 'comic' && c.type === 'comic') ||
        (targetType === 'manga' && c.type !== 'comic'))
  );

  let pool = canonicalPool;
  if (targetType === 'all') {
    const comics = canonicalPool.filter((c) => c.type === 'comic');
    const mangas = canonicalPool.filter((c) => c.type !== 'comic');
    const interleaved: typeof canonicalPool = [];
    const maxLen = Math.max(comics.length, mangas.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < comics.length) interleaved.push(comics[i]);
      if (i < mangas.length) interleaved.push(mangas[i]);
    }
    pool = interleaved.length > 0 ? interleaved : canonicalPool;
  }

  return pool.slice(0, limit).map((c) => ({
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

