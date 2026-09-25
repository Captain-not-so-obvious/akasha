import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  createWishlistItemSchema,
  updateWishlistItemSchema,
} from '../schemas/wishlist.schema.js';
import { recordActivity } from '../services/activity.service.js';
import { ActivityType } from '@prisma/client';

export async function wishlistRoutes(fastify: FastifyInstance): Promise<void> {
  // Protege todas as rotas deste plugin com o middleware de autenticação
  fastify.addHook('preHandler', authMiddleware);

  // GET /wishlist — Lista todos os itens do usuário autenticado
  fastify.get('/', async (request, reply) => {
    const items = await prisma.wishlist.findMany({
      where: { userId: request.userId },
      orderBy: { updatedAt: 'desc' },
    });
    return reply.send(items);
  });

  // POST /wishlist — Adiciona um item à biblioteca
  fastify.post('/', async (request, reply) => {
    const parsed = createWishlistItemSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'Dados inválidos.', details: parsed.error.flatten().fieldErrors });
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId: request.userId,
          tmdbId: parsed.data.tmdbId,
          mediaType: parsed.data.mediaType,
        },
      },
    });

    // Upsert: se já existe, atualiza; se não, cria
    const item = await prisma.wishlist.upsert({
      where: {
        userId_tmdbId_mediaType: {
          userId: request.userId,
          tmdbId: parsed.data.tmdbId,
          mediaType: parsed.data.mediaType,
        },
      },
      update: {
        status: parsed.data.status,
        userRating: parsed.data.userRating,
        notes: parsed.data.notes,
      },
      create: {
        userId: request.userId,
        tmdbId: parsed.data.tmdbId,
        mediaType: parsed.data.mediaType,
        status: parsed.data.status,
        userRating: parsed.data.userRating,
        notes: parsed.data.notes,
      },
    });

    // Determinar o tipo de atividade para registrar no feed
    let type: ActivityType = 'ADDED_TO_LIST';
    if (parsed.data.userRating !== undefined && (!existing || existing.userRating !== parsed.data.userRating)) {
      type = 'RATED_MEDIA';
    } else if (parsed.data.notes !== undefined && (!existing || existing.notes !== parsed.data.notes) && (parsed.data.userRating || existing?.userRating)) {
      type = 'RATED_MEDIA';
    } else if (existing && existing.status !== parsed.data.status) {
      type = 'STATUS_CHANGED';
    }

    try {
      await recordActivity({
        userId: request.userId,
        type,
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: parsed.data.title || null,
        posterPath: parsed.data.posterPath || null,
        userRating: item.userRating,
        status: item.status,
        review: item.notes,
      });
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
          status: parsed.data.status,
          userRating: parsed.data.userRating,
          notes: parsed.data.notes,
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
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
          title: parsed.data.title || null,
          posterPath: parsed.data.posterPath || null,
          userRating: item.userRating,
          status: item.status,
          review: item.notes,
        });
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
