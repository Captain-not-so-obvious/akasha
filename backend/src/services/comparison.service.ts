import { prisma } from '../lib/prisma.js';
import { fetchMediaDetails } from './tmdb.service.js';
import { DomainType, MediaType, WatchStatus } from '@prisma/client';

export interface AffinityResult {
  percentage: number;
  label: 'Almas Cósmicas' | 'Frequência Harmônica' | 'Mundos Paralelos' | 'Caos Gravitacional';
  totalShared: number;
  totalOverlapRated: number;
}

export interface ComparisonItem {
  domain: DomainType;
  externalId: string;
  title: string;
  coverUrl: string | null;
  releaseYear?: number | null;
  tmdbId?: number | null;
  mediaType?: MediaType | null;
}

export interface WatchTogetherItem extends ComparisonItem {}

export interface RatedOverlapItem extends ComparisonItem {
  myRating: number;
  friendRating: number;
  myReview: string | null;
  friendReview: string | null;
  delta: number;
}

export interface FriendRecommendationItem extends ComparisonItem {
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
  domainAffinities?: Partial<Record<DomainType, AffinityResult>>;
  watchTogether: WatchTogetherItem[];
  ratedOverlap: RatedOverlapItem[];
  friendRecommendations: FriendRecommendationItem[];
}

export interface WishlistRecord {
  id: number;
  userId: string;
  domain?: DomainType | string;
  externalId?: string;
  tmdbId?: number | null;
  mediaType?: MediaType | null;
  status: WatchStatus;
  userRating: number | null;
  notes: string | null;
  title?: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
  updatedAt: Date;
}

/**
 * Identifica o domínio canônico do item
 */
export function getDomain(item: WishlistRecord): DomainType {
  if (item.domain && ['movie', 'tv', 'game', 'book', 'comic'].includes(item.domain)) {
    return item.domain as DomainType;
  }
  if (item.mediaType === 'tv') return 'tv';
  return 'movie';
}

/**
 * Gera a chave única de equivalência universal de uma obra (domain:externalId)
 */
export function getItemKey(item: WishlistRecord): string {
  const domain = getDomain(item);
  const extId =
    item.externalId && item.externalId.trim() !== ''
      ? item.externalId
      : item.tmdbId
        ? String(item.tmdbId)
        : String(item.id);
  return `${domain}:${extId}`;
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
    myMap.set(getItemKey(item), item);
  }
  for (const item of friendItems) {
    friendMap.set(getItemKey(item), item);
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
 * Calcula afinidade individualizada para cada módulo/domínio cultural
 */
export function calculateDomainAffinities(
  myItems: WishlistRecord[],
  friendItems: WishlistRecord[]
): Partial<Record<DomainType, AffinityResult>> {
  const allDomains: DomainType[] = ['movie', 'tv', 'game', 'book', 'comic'];
  const domainAffinities: Partial<Record<DomainType, AffinityResult>> = {};

  for (const domain of allDomains) {
    const myDomainItems = myItems.filter((i) => getDomain(i) === domain);
    const friendDomainItems = friendItems.filter((i) => getDomain(i) === domain);

    if (myDomainItems.length > 0 || friendDomainItems.length > 0) {
      domainAffinities[domain] = calculateAffinity(myDomainItems, friendDomainItems);
    }
  }

  return domainAffinities;
}

/**
 * Hidrata metadados de mídias audiovisuais consultando primeiro
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
 * Constrói o objeto universal de item de comparação preservando domínio e metadados
 */
function buildComparisonItem(
  item: WishlistRecord,
  hydratedMap: Map<string, { title: string; posterUrl: string | null }>
): ComparisonItem {
  const domain = getDomain(item);
  const extId =
    item.externalId && item.externalId.trim() !== ''
      ? item.externalId
      : item.tmdbId
        ? String(item.tmdbId)
        : String(item.id);

  let title = item.title && item.title !== 'Sem título' ? item.title : '';
  let coverUrl = item.coverUrl || null;

  // Se for audiovisual e faltar metadados, consultar cache hidratado
  if (item.tmdbId && item.mediaType) {
    const cached = hydratedMap.get(`${item.mediaType}:${item.tmdbId}`);
    if (cached) {
      if (!title || title === `Mídia #${item.tmdbId}`) {
        title = cached.title;
      }
      if (!coverUrl) {
        coverUrl = cached.posterUrl;
      }
    }
  }

  if (!title) {
    title = item.title || `Obra #${extId}`;
  }

  return {
    domain,
    externalId: extId,
    title,
    coverUrl,
    releaseYear: item.releaseYear ?? null,
    tmdbId: item.tmdbId ?? (domain === 'movie' || domain === 'tv' ? Number(extId) || undefined : undefined),
    mediaType: item.mediaType ?? (domain === 'movie' || domain === 'tv' ? (domain as MediaType) : undefined),
  };
}

/**
 * Orquestrador principal da comparação de acervos entre o usuário autenticado e um amigo
 * Suporta todos os módulos culturais do Akasha (SPEC-006 v2.0.0)
 */
export async function compareUserLibraries(
  currentUserId: string,
  friendId: string,
  domainFilter?: string
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
  const [allMyItems, allFriendItems] = await Promise.all([
    prisma.wishlist.findMany({
      where: { userId: currentUserId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.wishlist.findMany({
      where: { userId: friendId },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  // Se houver filtro de domínio específico (e não 'all'), aplicar aos itens
  const myItems =
    domainFilter && domainFilter !== 'all'
      ? allMyItems.filter((i) => getDomain(i) === domainFilter)
      : allMyItems;

  const friendItems =
    domainFilter && domainFilter !== 'all'
      ? allFriendItems.filter((i) => getDomain(i) === domainFilter)
      : allFriendItems;

  // 3. Calcular Afinidade Cósmica Universal e por Domínio
  const affinity = calculateAffinity(myItems, friendItems);
  const domainAffinities = calculateDomainAffinities(allMyItems, allFriendItems);

  // Mapeamentos rápidos polimórficos
  const myMap = new Map<string, WishlistRecord>();
  for (const item of myItems) {
    myMap.set(getItemKey(item), item);
  }

  const friendMap = new Map<string, WishlistRecord>();
  for (const item of friendItems) {
    friendMap.set(getItemKey(item), item);
  }

  // 4. Identificar obras para cada aba
  const rawWatchTogether: WishlistRecord[] = [];
  const rawRatedOverlap: Array<{
    item: WishlistRecord;
    myRating: number;
    friendRating: number;
    myReview: string | null;
    friendReview: string | null;
    delta: number;
  }> = [];
  const rawFriendRecommendations: Array<{
    item: WishlistRecord;
    friendRating: number;
    friendReview: string | null;
    inMyBacklog: boolean;
  }> = [];

  // A. O que curtir juntos: ambos com status 'plan_to_watch'
  for (const [key, myItem] of myMap.entries()) {
    const friendItem = friendMap.get(key);
    if (
      friendItem &&
      myItem.status === 'plan_to_watch' &&
      friendItem.status === 'plan_to_watch'
    ) {
      rawWatchTogether.push(myItem);
    }
  }

  // B. Consenso & Duelo: ambos avaliaram (userRating !== null)
  for (const [key, myItem] of myMap.entries()) {
    const friendItem = friendMap.get(key);
    if (
      friendItem &&
      myItem.userRating !== null &&
      friendItem.userRating !== null
    ) {
      rawRatedOverlap.push({
        item: myItem,
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
    if (
      friendItem.userRating !== null &&
      friendItem.userRating >= 4
    ) {
      const myItem = myMap.get(key);
      const userAlreadyRated = myItem && myItem.userRating !== null;
      if (!userAlreadyRated) {
        rawFriendRecommendations.push({
          item: friendItem,
          friendRating: friendItem.userRating,
          friendReview: friendItem.notes,
          inMyBacklog: Boolean(myItem && myItem.status === 'plan_to_watch'),
        });
      }
    }
  }

  // Ordenar recomendações: nota maior do amigo primeiro
  rawFriendRecommendations.sort((a, b) => b.friendRating - a.friendRating);

  // 5. Hidratação complementar (apenas para audiovisuais legados que ainda precisem)
  const allReferencedItems: WishlistRecord[] = [
    ...rawWatchTogether,
    ...rawRatedOverlap.map((r) => r.item),
    ...rawFriendRecommendations.map((r) => r.item),
  ];

  const tmdbMediaToHydrate = allReferencedItems
    .filter(
      (item) =>
        item.tmdbId &&
        item.mediaType &&
        (!item.coverUrl || !item.title || item.title === 'Sem título')
    )
    .map((item) => ({
      tmdbId: item.tmdbId!,
      mediaType: item.mediaType!,
    }));

  const hydratedMap = await hydrateMediaBatch(tmdbMediaToHydrate);

  // 6. Montagem dos arrays finais com interfaces estritamente tipadas
  const watchTogether: WatchTogetherItem[] = rawWatchTogether.map((item) =>
    buildComparisonItem(item, hydratedMap)
  );

  const ratedOverlap: RatedOverlapItem[] = rawRatedOverlap.map((r) => {
    const base = buildComparisonItem(r.item, hydratedMap);
    return {
      ...base,
      myRating: r.myRating,
      friendRating: r.friendRating,
      myReview: r.myReview,
      friendReview: r.friendReview,
      delta: r.delta,
    };
  });

  const friendRecommendations: FriendRecommendationItem[] = rawFriendRecommendations.map(
    (r) => {
      const base = buildComparisonItem(r.item, hydratedMap);
      return {
        ...base,
        friendRating: r.friendRating,
        friendReview: r.friendReview,
        inMyBacklog: r.inMyBacklog,
      };
    }
  );

  return {
    friend: {
      id: friendProfile.id,
      username: friendProfile.username || 'Viajante Akasha',
      avatarUrl: friendProfile.avatarUrl,
      friendCode: friendProfile.friendCode,
    },
    affinity,
    domainAffinities,
    watchTogether,
    ratedOverlap,
    friendRecommendations,
  };
}
