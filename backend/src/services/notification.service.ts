import { MediaType, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { fetchTvLatestEpisode } from './tmdb.service.js';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data ? (input.data as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return notification;
}

export async function getNotifications(
  userId: string,
  page = 1,
  limit = 20,
  unreadOnly = false
) {
  const skip = (page - 1) * limit;
  const whereClause: Prisma.NotificationWhereInput = {
    userId,
    ...(unreadOnly ? { read: false } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: whereClause }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      unreadCount,
    },
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function markAsRead(userId: string, notificationId: number) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });

  return { id: notificationId, read: true, updated: result.count > 0 };
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return { count: result.count };
}

export async function savePushSubscription(
  userId: string,
  endpoint: string,
  p256dh: string,
  auth: string
) {
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh,
      auth,
    },
    create: {
      userId,
      endpoint,
      p256dh,
      auth,
    },
  });
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const result = await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
  return { deleted: result.count > 0 };
}

export async function notifyFriendsOnRating(
  authorUserId: string,
  tmdbId: number,
  mediaType: MediaType,
  userRating: number,
  review?: string | null,
  title?: string | null,
  posterPath?: string | null
) {
  // 1. Obter perfil do autor para exibir o nome de usuário amigável
  const authorProfile = await prisma.profile.findUnique({
    where: { id: authorUserId },
    select: { username: true, avatarUrl: true },
  });
  const authorName = authorProfile?.username || 'Um amigo';

  // 2. Localizar amigos confirmados (status = accepted)
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [{ requesterId: authorUserId }, { addresseeId: authorUserId }],
    },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === authorUserId ? f.addresseeId : f.requesterId
  );

  if (friendIds.length === 0) return [];

  // 3. Excluir estritamente amigos com bloqueio mútuo
  const blocked = await prisma.friendship.findMany({
    where: {
      status: 'blocked',
      OR: [{ requesterId: authorUserId }, { addresseeId: authorUserId }],
    },
  });

  const blockedIds = new Set(
    blocked.map((f) => (f.requesterId === authorUserId ? f.addresseeId : f.requesterId))
  );

  const targetFriendIds = friendIds.filter((id) => !blockedIds.has(id));
  if (targetFriendIds.length === 0) return [];

  // 4. Formatar título e mensagem
  const displayTitle = title || (mediaType === 'movie' ? 'um filme' : 'uma série');
  const notifTitle = `${authorName} avaliou ${displayTitle}`;
  const notifMessage = review && review.trim().length > 0
    ? `Atribuiu ${userRating} estrelas: "${review.trim()}"`
    : `Atribuiu ${userRating} estrelas à obra.`;

  // 5. Criar notificações para todos os amigos elegíveis
  const created = await Promise.all(
    targetFriendIds.map((friendId) =>
      createNotification({
        userId: friendId,
        type: 'FRIEND_RATED',
        title: notifTitle,
        message: notifMessage,
        data: {
          tmdbId,
          mediaType,
          friendId: authorUserId,
          authorUsername: authorName,
          authorAvatarUrl: authorProfile?.avatarUrl ?? null,
          posterPath: posterPath ?? null,
          userRating,
          review: review ?? null,
          actionUrl: `/library?tmdbId=${tmdbId}&type=${mediaType}`,
        },
      })
    )
  );

  return created;
}

export async function notifyFriendRequest(requesterId: string, addresseeId: string) {
  const requester = await prisma.profile.findUnique({
    where: { id: requesterId },
    select: { username: true, avatarUrl: true },
  });
  const requesterName = requester?.username || 'Um viajante';

  return createNotification({
    userId: addresseeId,
    type: 'FRIEND_REQUEST',
    title: 'Nova solicitação de amizade',
    message: `${requesterName} enviou uma solicitação de amizade para se conectar no Akasha.`,
    data: {
      friendId: requesterId,
      requesterUsername: requesterName,
      requesterAvatarUrl: requester?.avatarUrl ?? null,
      actionUrl: '/social',
    },
  });
}

export async function notifyFriendAccepted(requesterId: string, addresseeId: string) {
  const addressee = await prisma.profile.findUnique({
    where: { id: addresseeId },
    select: { username: true, avatarUrl: true },
  });
  const addresseeName = addressee?.username || 'Um amigo';

  return createNotification({
    userId: requesterId,
    type: 'FRIEND_ACCEPTED',
    title: 'Solicitação de amizade aceita',
    message: `${addresseeName} aceitou sua solicitação. Agora vocês podem acompanhar os acervos mutuamente!`,
    data: {
      friendId: addresseeId,
      friendUsername: addresseeName,
      friendAvatarUrl: addressee?.avatarUrl ?? null,
      actionUrl: '/social',
    },
  });
}

export async function checkNewEpisodesForWatching(userId: string) {
  // 1. Obter obras que estão sendo assistidas no momento (mediaType = tv e status = watching)
  const watchingSeries = await prisma.wishlist.findMany({
    where: {
      userId,
      mediaType: 'tv',
      status: 'watching',
    },
  });

  if (watchingSeries.length === 0) {
    return { newEpisodesFound: 0 };
  }

  let createdCount = 0;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const item of watchingSeries) {
    const episodeInfo = await fetchTvLatestEpisode(item.tmdbId);
    if (!episodeInfo || !episodeInfo.airDate) continue;

    const airDate = new Date(episodeInfo.airDate);
    // Verifica se o episódio foi ao ar recentemente (últimos 7 dias até hoje)
    if (airDate >= sevenDaysAgo && airDate <= now) {
      // 2. Verificar se já existe notificação deste episódio para este usuário
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: 'NEW_EPISODE',
          data: {
            path: ['episodeId'],
            equals: episodeInfo.id,
          },
        },
      });

      if (!existing) {
        await createNotification({
          userId,
          type: 'NEW_EPISODE',
          title: `Novo episódio de ${episodeInfo.seriesTitle}`,
          message: `T${episodeInfo.seasonNumber.toString().padStart(2, '0')}E${episodeInfo.episodeNumber.toString().padStart(2, '0')}: "${episodeInfo.name}" já está disponível!`,
          data: {
            tmdbId: item.tmdbId,
            mediaType: 'tv',
            episodeId: episodeInfo.id,
            episodeName: episodeInfo.name,
            seasonNumber: episodeInfo.seasonNumber,
            episodeNumber: episodeInfo.episodeNumber,
            posterPath: episodeInfo.posterUrl,
            stillUrl: episodeInfo.stillUrl,
            actionUrl: `/library?tmdbId=${item.tmdbId}&type=tv`,
          },
        });
        createdCount++;
      }
    }
  }

  return { newEpisodesFound: createdCount };
}
