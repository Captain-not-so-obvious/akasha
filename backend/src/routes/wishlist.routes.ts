import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  createWishlistItemSchema,
  updateWishlistItemSchema,
} from '../schemas/wishlist.schema.js';

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
        ...parsed.data,
        userId: request.userId,
      },
    });

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
      const item = await prisma.wishlist.update({
        where: {
          id: Number(id),
          userId: request.userId, // garante que só atualiza o próprio item
        },
        data: parsed.data,
      });
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
