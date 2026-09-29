import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  createWishlistItemSchema,
  updateWishlistItemSchema,
  listWishlistQuerySchema,
} from '../schemas/wishlist.schema.js';
import { recordActivity } from '../services/activity.service.js';
import { notifyFriendsOnRating } from '../services/notification.service.js';
import { ActivityType, DomainType, Prisma, WatchStatus } from '@prisma/client';

export async function wishlistRoutes(fastify: FastifyInstance): Promise<void> {
  // Protege todas as rotas deste plugin com o middleware de autenticação
  fastify.addHook('preHandler', authMiddleware);

  // GET /wishlist — Lista itens do usuário autenticado (com suporte opcional a ?domain= e ?status=)
  fastify.get('/', async (request, reply) => {
    const query = listWishlistQuerySchema.safeParse(request.query);
    const whereClause: {
      userId: string;
      domain?: DomainType;
      status?: WatchStatus;
    } = { userId: request.userId };

    if (query.success) {
      if (query.data.domain) {
        whereClause.domain = query.data.domain as DomainType;
      }
      if (query.data.status) {
        whereClause.status = query.data.status as WatchStatus;
      }
    }

    const items = await prisma.wishlist.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
    });
    return reply.send(items);
  });

  // POST /wishlist — Adiciona ou atualiza um item na biblioteca (polimórfico)
  fastify.post('/', async (request, reply) => {
    const parsed = createWishlistItemSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors });
    }

    const data = parsed.data;

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_domain_externalId: {
          userId: request.userId,
          domain: data.domain as DomainType,
          externalId: data.externalId,
        },
      },
    });

    // Upsert: se já existe, atualiza; se não, cria
    const item = await prisma.wishlist.upsert({
      where: {
        userId_domain_externalId: {
          userId: request.userId,
          domain: data.domain as DomainType,
          externalId: data.externalId,
        },
      },
      update: {
        status: data.status as WatchStatus,
        userRating: data.userRating,
        notes: data.notes,
        ...(data.title ? { title: data.title } : {}),
        ...(data.coverUrl ? { coverUrl: data.coverUrl } : {}),
        ...(data.releaseYear ? { releaseYear: data.releaseYear } : {}),
        ...(data.extraMeta ? { extraMeta: data.extraMeta as Prisma.InputJsonValue } : {}),
      },
      create: {
        userId: request.userId,
        domain: data.domain as DomainType,
        externalId: data.externalId,
        tmdbId: data.tmdbId ?? null,
        mediaType: data.mediaType ?? null,
        status: data.status as WatchStatus,
        userRating: data.userRating,
        notes: data.notes,
        title: data.title || 'Sem título',
        coverUrl: data.coverUrl || null,
        releaseYear: data.releaseYear || null,
        extraMeta: data.extraMeta ? (data.extraMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    // Determinar o tipo de atividade para registrar no feed
    let type: ActivityType = 'ADDED_TO_LIST';
    if (data.userRating !== undefined && (!existing || existing.userRating !== data.userRating)) {
      type = 'RATED_MEDIA';
    } else if (data.notes !== undefined && (!existing || existing.notes !== data.notes) && (data.userRating || existing?.userRating)) {
      type = 'RATED_MEDIA';
    } else if (existing && existing.status !== data.status) {
      type = 'STATUS_CHANGED';
    }

    try {
      await recordActivity({
        userId: request.userId,
        type,
        domain: item.domain,
        externalId: item.externalId,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title || data.title || null,
        posterPath: item.coverUrl || data.coverUrl || data.posterPath || null,
        userRating: item.userRating,
        status: item.status,
        review: item.notes,
      });

      if (
        type === 'RATED_MEDIA' &&
        item.userRating &&
        (item.domain === 'movie' || item.domain === 'tv') &&
        item.tmdbId &&
        item.mediaType
      ) {
        notifyFriendsOnRating(
          request.userId,
          item.tmdbId,
          item.mediaType,
          item.userRating,
          item.notes,
          item.title || data.title || null,
          item.coverUrl || data.posterPath || null
        ).catch((err) => fastify.log.warn({ err }, 'Falha ao notificar amigos sobre avaliação.'));
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Falha ao gravar registro de atividade no feed.');
    }

    return reply.status(201).send(item);
  });

  // PATCH /wishlist/:id — Atualiza status, nota ou observações
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateWishlistItemSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors });
    }

    try {
      const existing = await prisma.wishlist.findUnique({
        where: { id: Number(id), userId: request.userId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Item não encontrado.' });
      }

      const item = await prisma.wishlist.update({
        where: {
          id: Number(id),
          userId: request.userId, // garante que só atualiza o próprio item
        },
        data: {
          ...(parsed.data.status ? { status: parsed.data.status as WatchStatus } : {}),
          userRating: parsed.data.userRating,
          notes: parsed.data.notes,
          ...(parsed.data.title ? { title: parsed.data.title } : {}),
          ...(parsed.data.coverUrl || parsed.data.posterPath ? { coverUrl: parsed.data.coverUrl || parsed.data.posterPath } : {}),
          ...(parsed.data.releaseYear ? { releaseYear: parsed.data.releaseYear } : {}),
          ...(parsed.data.extraMeta ? { extraMeta: parsed.data.extraMeta as Prisma.InputJsonValue } : {}),
        },
      });

      let type: ActivityType = 'STATUS_CHANGED';
      if (parsed.data.userRating !== undefined && parsed.data.userRating !== existing.userRating) {
        type = 'RATED_MEDIA';
      } else if (parsed.data.notes !== undefined && parsed.data.notes !== existing.notes && item.userRating) {
        type = 'RATED_MEDIA';
      }

      try {
        await recordActivity({
          userId: request.userId,
          type,
          domain: item.domain,
          externalId: item.externalId,
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: item.title || parsed.data.title || null,
          posterPath: item.coverUrl || parsed.data.coverUrl || parsed.data.posterPath || null,
          userRating: item.userRating,
          status: item.status,
          review: item.notes,
        });

        if (
          type === 'RATED_MEDIA' &&
          item.userRating &&
          (item.domain === 'movie' || item.domain === 'tv') &&
          item.tmdbId &&
          item.mediaType
        ) {
          notifyFriendsOnRating(
            request.userId,
            item.tmdbId,
            item.mediaType,
            item.userRating,
            item.notes,
            item.title || parsed.data.title || null,
            item.coverUrl || parsed.data.posterPath || null
          ).catch((err) => fastify.log.warn({ err }, 'Falha ao notificar amigos sobre avaliação.'));
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Falha ao gravar registro de atividade no feed.');
      }

      return reply.send(item);
    } catch {
      return reply.status(404).send({ error: 'Item não encontrado.' });
    }
  });

  // DELETE /wishlist/:id — Remove um item da biblioteca
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    try {
      await prisma.wishlist.delete({
        where: {
          id: Number(id),
          userId: request.userId,
        },
      });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: 'Item não encontrado.' });
    }
  });
}
