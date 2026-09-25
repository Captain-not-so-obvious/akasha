import { prisma } from '../lib/prisma.js';
import { fetchMediaDetails } from './tmdb.service.js';
import { MediaType, WatchStatus } from '@prisma/client';

export interface AffinityResult {
  percentage: number;
  label: 'Almas Cósmicas' | 'Frequência Harmônica' | 'Mundos Paralelos' | 'Caos Gravitacional';
  totalShared: number;
  totalOverlapRated: number;
}

export interface WatchTogetherItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
}

export interface RatedOverlapItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  myRating: number;
  friendRating: number;
  myReview: string | null;
  friendReview: string | null;
  delta: number;
}

export interface FriendRecommendationItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  friendRating: number;
  friendReview: string | null;
  inMyBacklog: boolean;
}

export interface ComparisonResult {
  friend: {
    id: string;
    username: string;
    avatarUrl: string | null;
    friendCode: string | null;
  };
  affinity: AffinityResult;
  watchTogether: WatchTogetherItem[];
  ratedOverlap: RatedOverlapItem[];
  friendRecommendations: FriendRecommendationItem[];
}

interface WishlistRecord {
  id: number;
  userId: string;
  tmdbId: number;
  mediaType: MediaType;
  status: WatchStatus;
  userRating: number | null;
  notes: string | null;
  updatedAt: Date;
}

/**
 * Calcula os scores matemáticos de afinidade entre dois acervos:
 * Jaccard (sobreposição) + Alinhamento de notas atribuídas
 */
export function calculateAffinity(
  myItems: WishlistRecord[],
  friendItems: WishlistRecord[]
): AffinityResult {
  const myMap = new Map<string, WishlistRecord>();
  const friendMap = new Map<string, WishlistRecord>();

  for (const item of myItems) {
    myMap.set(`${item.mediaType}:${item.tmdbId}`, item);
  }
  for (const item of friendItems) {
    friendMap.set(`${item.mediaType}:${item.tmdbId}`, item);
  }

  const allKeys = new Set<string>([...myMap.keys(), ...friendMap.keys()]);
  const sharedKeys: string[] = [];

  for (const key of allKeys) {
    if (myMap.has(key) && friendMap.has(key)) {
      sharedKeys.push(key);
    }
  }

  // 1. Score de Sobreposição (Jaccard)
  const overlapScore = allKeys.size > 0 ? (sharedKeys.length / allKeys.size) * 100 : 0;

  // 2. Score de Notas (onde ambos avaliaram)
  let sumDiff = 0;
  let ratedCount = 0;

  for (const key of sharedKeys) {
    const myItem = myMap.get(key)!;
    const friendItem = friendMap.get(key)!;

    if (myItem.userRating !== null && friendItem.userRating !== null) {
      sumDiff += Math.abs(myItem.userRating - friendItem.userRating);
      ratedCount++;
    }
  }

  let ratingScore = 50; // valor neutro quando nenhum item foi avaliado por ambos
  if (ratedCount > 0) {
    // A nota varia de 1 a 5, diferença máxima é 4
    ratingScore = Math.max(0, Math.min(100, (1 - sumDiff / (4 * ratedCount)) * 100));
  } else if (overlapScore > 0) {
    ratingScore = overlapScore;
  }

  // 3. Ponderação final: 40% sobreposição + 60% notas
  const rawPercentage = Math.round(0.4 * overlapScore + 0.6 * ratingScore);
  const percentage = Math.max(0, Math.min(100, rawPercentage));

  let label: AffinityResult['label'] = 'Caos Gravitacional';
  if (percentage >= 90) {
    label = 'Almas Cósmicas';
  } else if (percentage >= 75) {
    label = 'Frequência Harmônica';
  } else if (percentage >= 50) {
    label = 'Mundos Paralelos';
  }

  return {
    percentage,
    label,
    totalShared: sharedKeys.length,
    totalOverlapRated: ratedCount,
  };
}

/**
 * Hidrata metadados de mídias (título, pôster) consultando primeiro
 * o cache em atividades gravadas no banco e, como fallback, o serviço TMDB.
 */
export async function hydrateMediaBatch(
  mediaList: Array<{ tmdbId: number; mediaType: MediaType }>
): Promise<Map<string, { title: string; posterUrl: string | null }>> {
  const result = new Map<string, { title: string; posterUrl: string | null }>();
  if (mediaList.length === 0) return result;

  // Deduplica lista
  const uniqueMedia = new Map<string, { tmdbId: number; mediaType: MediaType }>();
  for (const m of mediaList) {
    uniqueMedia.set(`${m.mediaType}:${m.tmdbId}`, m);
  }

  // 1. Busca rápida em Activity (onde já foram cacheados títulos e posters)
  const activities = await prisma.activity.findMany({
    where: {
      OR: Array.from(uniqueMedia.values()).map((m) => ({
        tmdbId: m.tmdbId,
        mediaType: m.mediaType,
      })),
      title: { not: null },
    },
    select: {
      tmdbId: true,
      mediaType: true,
      title: true,
      posterPath: true,
    },
  });

  for (const act of activities) {
    const key = `${act.mediaType}:${act.tmdbId}`;
    if (!result.has(key) && act.title) {
      result.set(key, {
        title: act.title,
        posterUrl: act.posterPath,
      });
    }
  }

  // 2. Itens que ainda precisam de resolução via TMDB
  const missingMedia = Array.from(uniqueMedia.values()).filter(
    (m) => !result.has(`${m.mediaType}:${m.tmdbId}`)
  );

  if (missingMedia.length > 0) {
    const settled = await Promise.allSettled(
      missingMedia.map(async (m) => {
        const details = await fetchMediaDetails(m.tmdbId, m.mediaType);
        return {
          key: `${m.mediaType}:${m.tmdbId}`,
          title: details?.title || `Mídia #${m.tmdbId}`,
          posterUrl: details?.posterUrl || null,
        };
      })
    );

    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value) {
        result.set(item.value.key, {
          title: item.value.title,
          posterUrl: item.value.posterUrl,
        });
      }
    }
  }

  return result;
}

/**
 * Orquestrador principal da comparação de acervos entre o usuário autenticado e um amigo
 */
export async function compareUserLibraries(
  currentUserId: string,
  friendId: string
): Promise<ComparisonResult | null> {
  // 1. Validar perfil do amigo
  const friendProfile = await prisma.profile.findUnique({
    where: { id: friendId },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      friendCode: true,
    },
  });

  if (!friendProfile) return null;

  // 2. Buscar acervos de ambos
  const [myItems, friendItems] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId: currentUserId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.wishlist.findMany({
      where: { userId: friendId },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  // 3. Calcular Afinidade Cósmica
  const affinity = calculateAffinity(myItems, friendItems);

  // Mapeamentos rápidos
  const myMap = new Map<string, WishlistRecord>();
  for (const item of myItems) {
    myMap.set(`${item.mediaType}:${item.tmdbId}`, item);
  }

  const friendMap = new Map<string, WishlistRecord>();
  for (const item of friendItems) {
    friendMap.set(`${item.mediaType}:${item.tmdbId}`, item);
  }

  // 4. Identificar obras para cada aba
  const rawWatchTogether: Array<{ tmdbId: number; mediaType: MediaType }> = [];
  const rawRatedOverlap: Array<{
    tmdbId: number;
    mediaType: MediaType;
    myRating: number;
    friendRating: number;
    myReview: string | null;
    friendReview: string | null;
    delta: number;
  }> = [];
  const rawFriendRecommendations: Array<{
    tmdbId: number;
    mediaType: MediaType;
    friendRating: number;
    friendReview: string | null;
    inMyBacklog: boolean;
  }> = [];

  // A. O que ver juntos: ambos com status 'plan_to_watch'
  for (const [key, myItem] of myMap.entries()) {
    const friendItem = friendMap.get(key);
    if (friendItem && myItem.status === 'plan_to_watch' && friendItem.status === 'plan_to_watch') {
      rawWatchTogether.push({ tmdbId: myItem.tmdbId, mediaType: myItem.mediaType });
    }
  }

  // B. Consenso & Duelo: ambos avaliaram (userRating !== null)
  for (const [key, myItem] of myMap.entries()) {
    const friendItem = friendMap.get(key);
    if (friendItem && myItem.userRating !== null && friendItem.userRating !== null) {
      rawRatedOverlap.push({
        tmdbId: myItem.tmdbId,
        mediaType: myItem.mediaType,
        myRating: myItem.userRating,
        friendRating: friendItem.userRating,
        myReview: myItem.notes,
        friendReview: friendItem.notes,
        delta: Math.abs(myItem.userRating - friendItem.userRating),
      });
    }
  }

  // Ordenar consensos perfeitos primeiro (delta = 0), seguido por duelos
  rawRatedOverlap.sort((a, b) => a.delta - b.delta);

  // C. Recomendações do Amigo: obras que o amigo avaliou com 4 ou 5 estrelas
  // e que o usuário ainda não avaliou
  for (const [key, friendItem] of friendMap.entries()) {
    if (friendItem.userRating !== null && friendItem.userRating >= 4) {
      const myItem = myMap.get(key);
      const userAlreadyRated = myItem && myItem.userRating !== null;
      if (!userAlreadyRated) {
        rawFriendRecommendations.push({
          tmdbId: friendItem.tmdbId,
          mediaType: friendItem.mediaType,
          friendRating: friendItem.userRating,
          friendReview: friendItem.notes,
          inMyBacklog: Boolean(myItem && myItem.status === 'plan_to_watch'),
        });
      }
    }
  }

  // Ordenar recomendações: nota maior do amigo primeiro
  rawFriendRecommendations.sort((a, b) => b.friendRating - a.friendRating);

  // 5. Hidratação dos metadados visuais (título, poster)
  const mediaToHydrate: Array<{ tmdbId: number; mediaType: MediaType }> = [
    ...rawWatchTogether,
    ...rawRatedOverlap.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })),
    ...rawFriendRecommendations.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })),
  ];

  const hydratedMap = await hydrateMediaBatch(mediaToHydrate);

  const watchTogether: WatchTogetherItem[] = rawWatchTogether.map((item) => {
    const meta = hydratedMap.get(`${item.mediaType}:${item.tmdbId}`);
    return {
      tmdbId: item.tmdbId,
      mediaType: item.mediaType,
      title: meta?.title || `Mídia #${item.tmdbId}`,
      posterUrl: meta?.posterUrl || null,
    };
  });

  const ratedOverlap: RatedOverlapItem[] = rawRatedOverlap.map((item) => {
    const meta = hydratedMap.get(`${item.mediaType}:${item.tmdbId}`);
    return {
      ...item,
      title: meta?.title || `Mídia #${item.tmdbId}`,
      posterUrl: meta?.posterUrl || null,
    };
  });

  const friendRecommendations: FriendRecommendationItem[] = rawFriendRecommendations.map((item) => {
    const meta = hydratedMap.get(`${item.mediaType}:${item.tmdbId}`);
    return {
      ...item,
      title: meta?.title || `Mídia #${item.tmdbId}`,
      posterUrl: meta?.posterUrl || null,
    };
  });

  return {
    friend: {
      id: friendProfile.id,
      username: friendProfile.username || 'Viajante Akasha',
      avatarUrl: friendProfile.avatarUrl,
      friendCode: friendProfile.friendCode,
    },
    affinity,
    watchTogether,
    ratedOverlap,
    friendRecommendations,
  };
}
