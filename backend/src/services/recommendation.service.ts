import { prisma } from '../lib/prisma.js';
import { fetchMediaRecommendations, fetchTrendingMedia, MediaDetails } from './tmdb.service.js';
import { RecommendedItem } from '../schemas/recommendation.schema.js';

interface UserWishlistItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  userRating: number | null;
  status: 'plan_to_watch' | 'watching' | 'completed' | 'dropped';
}

/**
 * Calcula os pesos de um item da wishlist do usuário com base na nota e status.
 */
/**
 * Calcula os pesos de um item da wishlist do usuário com base na nota e status.
 *
 * Regras:
 * - Se o status for 'dropped' (abandonado), peso fortemente negativo (-3.0).
 * - Se a nota for 1 ou 2 estrelas (dislike), peso negativo independente de status.
 * - Para avaliações positivas (3 a 5 estrelas) ou sem nota, aplica o multiplicador de status.
 */
export function calculateItemWeight(item: UserWishlistItem): number {
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
      statusMultiplier = 1.5;
      break;
    case 'watching':
      statusMultiplier = 1.2;
      break;
    case 'plan_to_watch':
      statusMultiplier = 1.0;
      break;
  }

  return ratingWeight * statusMultiplier;
}

/**
 * Retorna as recomendações personalizadas para um determinado usuário.
 */
export async function getUserRecommendations(
  userId: string,
  options: { limit?: number; mediaType?: 'movie' | 'tv' | 'all' } = {}
): Promise<RecommendedItem[]> {
  const limit = options.limit ?? 10;
  const targetType = options.mediaType ?? 'all';

  // 1. Busca histórico do usuário no banco
  const wishlistItems = await prisma.wishlist.findMany({
    where: { userId },
  });

  // Conjunto de itens já na wishlist para filtragem rápida
  const existingSet = new Set(
    wishlistItems.map((item) => `${item.mediaType}:${item.tmdbId}`)
  );

  // 2. Se a wishlist estiver vazia ou sem avaliações positivas, dispara Cold Start
  const positiveItems = wishlistItems.filter((item) => {
    const weight = calculateItemWeight({
      tmdbId: item.tmdbId,
      mediaType: item.mediaType as 'movie' | 'tv',
      userRating: item.userRating,
      status: item.status as any,
    });
    return weight > 0;
  });

  if (positiveItems.length === 0) {
    return getColdStartRecommendations(existingSet, targetType, limit);
  }

  // Ordena itens positivos do usuário pelo peso calculado (maior peso primeiro).
  // Se targetType for especificado ('tv' ou 'movie'), prioriza mídias daquele tipo para servir de semente.
  // Em caso de empate de peso, prioriza as avaliações/atualizações mais recentes!
  const sortedUserItems = [...positiveItems].sort((a, b) => {
    if (targetType !== 'all') {
      const matchA = a.mediaType === targetType ? 1 : 0;
      const matchB = b.mediaType === targetType ? 1 : 0;
      if (matchB !== matchA) {
        return matchB - matchA;
      }
    }

    const wA = calculateItemWeight({
      tmdbId: a.tmdbId,
      mediaType: a.mediaType as 'movie' | 'tv',
      userRating: a.userRating,
      status: a.status as any,
    });
    const wB = calculateItemWeight({
      tmdbId: b.tmdbId,
      mediaType: b.mediaType as 'movie' | 'tv',
      userRating: b.userRating,
      status: b.status as any,
    });

    if (wB !== wA) {
      return wB - wA;
    }

    // Desempate por recência (updatedAt/createdAt mais recente primeiro)
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);

    return timeB - timeA;
  });

  // Pega sementes do usuário: se targetType === 'all', equilibra entre filmes e séries
  let seedItems: typeof positiveItems = [];
  if (targetType === 'all') {
    const movieSeeds = sortedUserItems.filter((i) => i.mediaType === 'movie').slice(0, 3);
    const tvSeeds = sortedUserItems.filter((i) => i.mediaType === 'tv').slice(0, 3);
    seedItems = [...movieSeeds, ...tvSeeds];
    if (seedItems.length === 0) {
      seedItems = sortedUserItems.slice(0, 5);
    }
  } else {
    seedItems = sortedUserItems.slice(0, 5);
  }

  const candidateMap = new Map<
    string,
    { media: MediaDetails; score: number; reason: string }
  >();

  // 3. Para cada semente, busca recomendações da API do TMDB
  for (const seed of seedItems) {
    const seedMediaType = seed.mediaType as 'movie' | 'tv';
    const rawRecs = await fetchMediaRecommendations(seed.tmdbId, seedMediaType);

    const seedWeight = calculateItemWeight({
      tmdbId: seed.tmdbId,
      mediaType: seedMediaType,
      userRating: seed.userRating,
      status: seed.status as any,
    });

    for (const rec of rawRecs) {
      const key = `${rec.mediaType}:${rec.id}`;

      // Pula se o usuário já tem na wishlist
      if (existingSet.has(key)) {
        continue;
      }

      // Aplica filtro por tipo de mídia se solicitado
      if (targetType !== 'all' && rec.mediaType !== targetType) {
        continue;
      }

      // Cálculo de score baseado no TMDB vote_average + peso do item semente
      const baseVote = rec.voteAverage ?? 7.0;
      const calculatedScore = Math.min(
        99,
        Math.max(60, Math.round(baseVote * 6 + seedWeight * 8))
      );

      // Gerador de explicações amigáveis baseadas no feedback do usuário
      let reason = `Recomendado com base no seu gosto por mídias do Akasha`;
      if (seed.userRating && seed.userRating >= 4) {
        reason = `Porque você avaliou um item similar com ${seed.userRating}★`;
      } else if (seed.status === 'completed') {
        reason = `Porque você concluiu títulos semelhantes na sua lista`;
      }

      if (!candidateMap.has(key) || candidateMap.get(key)!.score < calculatedScore) {
        candidateMap.set(key, {
          media: rec,
          score: calculatedScore,
          reason,
        });
      }
    }
  }

  // 4. Se não encontrou candidatos suficientes via sementes, complementa com Trending
  if (candidateMap.size < limit) {
    const trending = (await fetchTrendingMedia(targetType)) || [];
    for (const item of trending) {
      const key = `${item.mediaType}:${item.id}`;
      if (!existingSet.has(key) && !candidateMap.has(key)) {
        if (targetType === 'all' || item.mediaType === targetType) {
          candidateMap.set(key, {
            media: item,
            score: Math.min(95, Math.round((item.voteAverage ?? 7.0) * 10)),
            reason: `Em alta esta semana nas telas do Akasha`,
          });
        }
      }
    }
  }

  // 5. Converte para lista ordenada (e intercalada se targetType === 'all')
  const allCandidates = Array.from(candidateMap.values());
  let finalCandidates: typeof allCandidates = [];

  if (targetType === 'all') {
    const movieCandidates = allCandidates
      .filter((c) => c.media.mediaType === 'movie')
      .sort((a, b) => b.score - a.score);

    const tvCandidates = allCandidates
      .filter((c) => c.media.mediaType === 'tv')
      .sort((a, b) => b.score - a.score);

    // Intercala filmes e séries para garantir um mix rico e diversificado na aba 'Todos'
    const maxLength = Math.max(movieCandidates.length, tvCandidates.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < movieCandidates.length) finalCandidates.push(movieCandidates[i]);
      if (i < tvCandidates.length) finalCandidates.push(tvCandidates[i]);
    }
  } else {
    finalCandidates = allCandidates.sort((a, b) => b.score - a.score);
  }

  const result: RecommendedItem[] = finalCandidates
    .slice(0, limit)
    .map(({ media, score, reason }) => ({
      tmdbId: media.id,
      title: media.title,
      overview: media.overview,
      posterUrl: media.posterUrl,
      backdropUrl: media.backdropUrl,
      mediaType: media.mediaType,
      voteAverage: media.voteAverage,
      reason,
      score,
      isColdStart: false,
    }));

  return result;
}

/**
 * Recomendações para quando o usuário não possui histórico suficiente.
 */
export async function getColdStartRecommendations(
  existingSet: Set<string>,
  targetType: 'movie' | 'tv' | 'all',
  limit: number
): Promise<RecommendedItem[]> {
  const trending = await fetchTrendingMedia(targetType);

  return trending
    .filter((item) => !existingSet.has(`${item.mediaType}:${item.id}`))
    .filter((item) => targetType === 'all' || item.mediaType === targetType)
    .slice(0, limit)
    .map((media) => ({
      tmdbId: media.id,
      title: media.title,
      overview: media.overview,
      posterUrl: media.posterUrl,
      backdropUrl: media.backdropUrl,
      mediaType: media.mediaType,
      voteAverage: media.voteAverage,
      reason: 'Principais tendências para você começar sua jornada no Akasha',
      score: Math.min(95, Math.round((media.voteAverage ?? 7.5) * 10)),
      isColdStart: true,
    }));
}
