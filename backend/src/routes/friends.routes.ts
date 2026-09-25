import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { verifySupabaseAuth } from '../middlewares/auth.middleware.js';
import { generateFriendCode, normalizeFriendCode } from '../lib/friendCode.js';
import {
  sendFriendRequestSchema,
  respondFriendRequestSchema,
  friendshipParamSchema,
  friendParamSchema,
  updateProfileSchema,
} from '../schemas/friends.schema.js';
import { compareFriendParamSchema } from '../schemas/comparison.schema.js';
import { compareUserLibraries } from '../services/comparison.service.js';

export const friendsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Todas as rotas sociais exigem autenticação prévia
  fastify.addHook('preHandler', verifySupabaseAuth);

  // 1. Enviar solicitação de amizade (E-mail, @username ou Friend Code)
  fastify.post('/request', async (request, reply) => {
    const parseResult = sendFriendRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados inválidos.',
        details: parseResult.error.format(),
      });
    }

    const rawTarget = parseResult.data.target;
    const cleanHandle = rawTarget.startsWith('@') ? rawTarget.slice(1).trim() : rawTarget;
    const normalizedCode = normalizeFriendCode(rawTarget);

    // Localiza o usuário alvo pelo e-mail, username ou Friend Code
    const targetProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          { email: { equals: rawTarget, mode: 'insensitive' } },
          { username: { equals: cleanHandle, mode: 'insensitive' } },
          { friendCode: { equals: normalizedCode, mode: 'insensitive' } },
          { friendCode: { equals: rawTarget, mode: 'insensitive' } },
        ],
      },
    });

    if (!targetProfile) {
      return reply.status(404).send({
        error: 'Nenhum viajante encontrado com este e-mail, usuário ou código.',
      });
    }

    if (targetProfile.id === request.userId) {
      return reply.status(400).send({
        error: 'Você não pode enviar uma solicitação de amizade para si mesmo.',
      });
    }

    // Verifica relacionamento existente
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: request.userId, addresseeId: targetProfile.id },
          { requesterId: targetProfile.id, addresseeId: request.userId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return reply.status(400).send({ error: 'Vocês já são amigos no Akasha.' });
      }

      if (existing.status === 'blocked') {
        // Resposta indistinguível para preservar privacidade
        return reply.status(404).send({
          error: 'Nenhum viajante encontrado com este e-mail, usuário ou código.',
        });
      }

      if (existing.status === 'pending') {
        if (existing.requesterId === request.userId) {
          return reply.status(400).send({
            error: 'Você já enviou uma solicitação de amizade pendente para este usuário.',
          });
        } else {
          return reply.status(400).send({
            error: 'Este usuário já lhe enviou uma solicitação. Verifique suas solicitações pendentes.',
          });
        }
      }

      // Se havia sido recusada anteriormente, reativa a solicitação com status pending
      if (existing.status === 'declined') {
        await prisma.friendship.update({
          where: { id: existing.id },
          data: {
            requesterId: request.userId,
            addresseeId: targetProfile.id,
            status: 'pending',
          },
        });

        return reply.status(200).send({
          success: true,
          message: 'Solicitação de amizade reenviada com sucesso!',
        });
      }
    }

    // Cria nova solicitação pendente
    await prisma.friendship.create({
      data: {
        requesterId: request.userId,
        addresseeId: targetProfile.id,
        status: 'pending',
      },
    });

    return reply.status(201).send({
      success: true,
      message: 'Solicitação de amizade enviada com sucesso!',
    });
  });

  // 2. Listar amigos confirmados
  fastify.get('/', async (request, reply) => {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: request.userId },
          { addresseeId: request.userId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            friendCode: true,
            _count: { select: { wishlists: true } },
          },
        },
        addressee: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            friendCode: true,
            _count: { select: { wishlists: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const friends = friendships.map(f => {
      const isRequester = f.requesterId === request.userId;
      const friend = isRequester ? f.addressee : f.requester;
      return {
        friendshipId: f.id,
        id: friend.id,
        username: friend.username || 'Viajante Akasha',
        avatarUrl: friend.avatarUrl,
        friendCode: friend.friendCode,
        totalMedia: friend._count.wishlists,
        friendsSince: f.updatedAt,
      };
    });

    return reply.send(friends);
  });

  // 3. Listar solicitações pendentes (recebidas e enviadas)
  fastify.get('/requests', async (request, reply) => {
    const [received, sent] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          addresseeId: request.userId,
          status: 'pending',
        },
        include: {
          requester: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              friendCode: true,
              _count: { select: { wishlists: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.friendship.findMany({
        where: {
          requesterId: request.userId,
          status: 'pending',
        },
        include: {
          addressee: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              friendCode: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return reply.send({
      received: received.map(r => ({
        id: r.id,
        createdAt: r.createdAt,
        user: {
          id: r.requester.id,
          username: r.requester.username || 'Viajante Akasha',
          avatarUrl: r.requester.avatarUrl,
          friendCode: r.requester.friendCode,
          totalMedia: r.requester._count.wishlists,
        },
      })),
      sent: sent.map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        user: {
          id: s.addressee.id,
          username: s.addressee.username || 'Viajante Akasha',
          avatarUrl: s.addressee.avatarUrl,
          friendCode: s.addressee.friendCode,
        },
      })),
    });
  });

  // 4. Responder a uma solicitação (aceitar, recusar ou bloquear)
  fastify.patch('/requests/:id', async (request, reply) => {
    const paramResult = friendshipParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'ID de solicitação inválido.' });
    }

    const bodyResult = respondFriendRequestSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        error: 'Ação inválida.',
        details: bodyResult.error.format(),
      });
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: paramResult.data.id },
    });

    if (!friendship || friendship.addresseeId !== request.userId) {
      return reply.status(404).send({ error: 'Solicitação não encontrada.' });
    }

    if (friendship.status !== 'pending') {
      return reply.status(400).send({ error: 'Esta solicitação não está mais pendente.' });
    }

    const { action } = bodyResult.data;

    if (action === 'block') {
      const updated = await prisma.friendship.update({
        where: { id: friendship.id },
        data: {
          requesterId: request.userId,
          addresseeId: friendship.requesterId,
          status: 'blocked',
        },
      });

      return reply.send({
        success: true,
        status: updated.status,
        message: 'Usuário bloqueado com sucesso.',
      });
    }

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: action === 'accept' ? 'accepted' : 'declined' },
    });

    return reply.send({
      success: true,
      status: updated.status,
      message: action === 'accept' ? 'Amizade confirmada!' : 'Solicitação recusada.',
    });
  });

  // 5. Listar usuários bloqueados pelo usuário autenticado
  fastify.get('/blocked', async (request, reply) => {
    const blockedRelations = await prisma.friendship.findMany({
      where: {
        requesterId: request.userId,
        status: 'blocked',
      },
      include: {
        addressee: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            friendCode: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const blockedList = blockedRelations.map(b => ({
      friendshipId: b.id,
      id: b.addressee.id,
      username: b.addressee.username || 'Viajante Akasha',
      avatarUrl: b.addressee.avatarUrl,
      friendCode: b.addressee.friendCode,
      blockedAt: b.updatedAt,
    }));

    return reply.send(blockedList);
  });

  // 6. Bloquear um usuário diretamente (seja amigo atual ou não)
  fastify.post('/:id/block', async (request, reply) => {
    const paramResult = friendParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'ID de usuário inválido.' });
    }

    const targetId = paramResult.data.id;
    if (targetId === request.userId) {
      return reply.status(400).send({ error: 'Você não pode bloquear a si mesmo.' });
    }

    const targetProfile = await prisma.profile.findUnique({
      where: { id: targetId },
    });

    if (!targetProfile) {
      return reply.status(404).send({ error: 'Usuário não encontrado.' });
    }

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: request.userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: request.userId },
        ],
      },
    });

    if (existing) {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: request.userId,
          addresseeId: targetId,
          status: 'blocked',
        },
      });
    } else {
      await prisma.friendship.create({
        data: {
          requesterId: request.userId,
          addresseeId: targetId,
          status: 'blocked',
        },
      });
    }

    return reply.send({ success: true, message: 'Usuário bloqueado com sucesso.' });
  });

  // 7. Desbloquear um usuário
  fastify.post('/:id/unblock', async (request, reply) => {
    const paramResult = friendParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'ID de usuário inválido.' });
    }

    const targetId = paramResult.data.id;

    const blocked = await prisma.friendship.findFirst({
      where: {
        requesterId: request.userId,
        addresseeId: targetId,
        status: 'blocked',
      },
    });

    if (!blocked) {
      return reply.status(404).send({
        error: 'Este usuário não consta na sua lista de bloqueados.',
      });
    }

    await prisma.friendship.delete({
      where: { id: blocked.id },
    });

    return reply.send({ success: true, message: 'Usuário desbloqueado com sucesso.' });
  });

  // 8. Desfazer amizade
  fastify.delete('/:id', async (request, reply) => {
    const paramResult = friendParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'ID de usuário inválido.' });
    }

    const friendId = paramResult.data.id;

    const existing = await prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: request.userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: request.userId },
        ],
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Amizade não encontrada.' });
    }

    await prisma.friendship.delete({
      where: { id: existing.id },
    });

    return reply.send({ success: true, message: 'Amizade desfeita.' });
  });

  // 9. Regenerar Friend Code (Revogação de segurança)
  fastify.post('/regenerate-code', async (request, reply) => {
    const newCode = generateFriendCode();

    const updated = await prisma.profile.update({
      where: { id: request.userId },
      data: { friendCode: newCode },
      select: { friendCode: true },
    });

    return reply.send({
      success: true,
      friendCode: updated.friendCode,
      message: 'Novo Código de Amigo gerado com sucesso. O código anterior foi invalidado.',
    });
  });

  // 10. Sincronia Cósmica: Comparação de Acervos entre amigos (SPEC-006)
  fastify.get('/:id/compare', async (request, reply) => {
    const paramResult = compareFriendParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        error: 'ID de amigo inválido.',
        details: paramResult.error.format(),
      });
    }

    const friendId = paramResult.data.id;

    if (friendId === request.userId) {
      return reply.status(400).send({
        error: 'Não é possível comparar seu acervo consigo mesmo.',
      });
    }

    // Validação estrita de autorização e amizade bilateral
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: request.userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: request.userId },
        ],
      },
    });

    if (!friendship || friendship.status !== 'accepted') {
      if (friendship && friendship.status === 'blocked') {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }
      return reply.status(403).send({
        error: 'Você só pode comparar acervos com viajantes que sejam seus amigos confirmados.',
      });
    }

    const comparison = await compareUserLibraries(request.userId, friendId);

    if (!comparison) {
      return reply.status(404).send({ error: 'Perfil de amigo não encontrado.' });
    }

    return reply.send(comparison);
  });
};
