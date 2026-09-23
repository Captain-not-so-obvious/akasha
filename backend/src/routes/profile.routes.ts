import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { verifySupabaseAuth } from '../middlewares/auth.middleware.js';
import { updateProfileSchema } from '../schemas/friends.schema.js';

export const profileRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', verifySupabaseAuth);

  // 1. Obter dados do perfil do usuário autenticado
  fastify.get('/me', async (request, reply) => {
    const [profile, totalFriends] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: request.userId },
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          friendCode: true,
          _count: {
            select: {
              wishlists: true,
            },
          },
        },
      }),
      prisma.friendship.count({
        where: {
          status: 'accepted',
          OR: [
            { requesterId: request.userId },
            { addresseeId: request.userId },
          ],
        },
      }),
    ]);

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    return reply.send({
      id: profile.id,
      email: profile.email,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      friendCode: profile.friendCode,
      totalMedia: profile._count.wishlists,
      totalFriends,
    });
  });

  // 2. Atualizar username ou avatarUrl
  fastify.patch('/me', async (request, reply) => {
    const parseResult = updateProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos.',
        details: parseResult.error.format(),
      });
    }

    const { username, avatarUrl } = parseResult.data;

    // Se informou um novo username, verifica duplicidade
    if (username) {
      const cleanUsername = username.trim();
      const existing = await prisma.profile.findFirst({
        where: {
          username: { equals: cleanUsername, mode: 'insensitive' },
          NOT: { id: request.userId },
        },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Este nome de usuário já está em uso por outro viajante.',
        });
      }
    }

    const updated = await prisma.profile.update({
      where: { id: request.userId },
      data: {
        ...(username ? { username: username.trim() } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        friendCode: true,
      },
    });

    return reply.send({
      success: true,
      profile: updated,
      message: 'Perfil atualizado com sucesso!',
    });
  });
};
