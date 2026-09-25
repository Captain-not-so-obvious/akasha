import { ActivityType, MediaType, WatchStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { fetchMediaDetails } from './tmdb.service.js';

export interface RecordActivityInput {
  userId: string;
  type: ActivityType;
  tmdbId: number;
  mediaType: MediaType;
  title?: string | null;
  posterPath?: string | null;
  userRating?: number | null;
  status?: WatchStatus | null;
  review?: string | null;
}

export async function recordActivity(input: RecordActivityInput) {
  let title = input.title;
  let posterPath = input.posterPath;

  // Se o título ou poster não foram enviados, consulta o TMDB para garantir metadados reais
  if (!title || !posterPath) {
    try {
      const details = await fetchMediaDetails(input.tmdbId, input.mediaType);
      if (details) {
        title = title || details.title;
        posterPath = posterPath || details.posterUrl;
      }
    } catch {
      // prossegue com os valores fornecidos caso haja falha temporária no TMDB
    }
  }

  return prisma.activity.create({
    data: {
      userId: input.userId,
      type: input.type,
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
      title: title || null,
      posterPath: posterPath || null,
      userRating: input.userRating,
      status: input.status,
      review: input.review || null,
    },
  });
}

export async function getFeedForUser(userId: string, page = 1, limit = 20) {
  // 1. Obter IDs dos amigos confirmados (accepted)
  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  // 2. Obter IDs dos usuários bloqueados (para excluir estritamente do feed)
  const blockedFriendships = await prisma.friendship.findMany({
    where: {
      status: 'blocked',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  const blockedIds = new Set(
    blockedFriendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    )
  );

  // IDs permitidos: o próprio usuário + amigos confirmados que NÃO estão bloqueados
  const allowedUserIds = [userId, ...friendIds].filter((id) => !blockedIds.has(id));

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: {
        userId: { in: allowedUserIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.activity.count({
      where: {
        userId: { in: allowedUserIds },
      },
    }),
  ]);

  // Cura e enriquece registros que estejam sem título ou pôster (ex: legados ou criados sem metadados)
  const enrichedActivities = await Promise.all(
    activities.map(async (act) => {
      if (!act.title || !act.posterPath) {
        try {
          const details = await fetchMediaDetails(act.tmdbId, act.mediaType);
          if (details) {
            const updatedTitle = act.title || details.title;
            const updatedPoster = act.posterPath || details.posterUrl;

            // Salva no banco em segundo plano para futuras requisições serem instantâneas
            prisma.activity
              .update({
                where: { id: act.id },
                data: {
                  title: updatedTitle,
                  posterPath: updatedPoster,
                },
              })
              .catch(() => {});

            return {
              ...act,
              title: updatedTitle,
              posterPath: updatedPoster,
            };
          }
        } catch {
          // ignora erro e mantém o registro original
        }
      }
      return act;
    })
  );

  return {
    activities: enrichedActivities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
