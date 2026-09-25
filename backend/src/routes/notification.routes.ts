import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { verifySupabaseAuth } from '../middlewares/auth.middleware.js';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  savePushSubscriptionSchema,
  deletePushSubscriptionSchema,
} from '../schemas/notification.schema.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  savePushSubscription,
  deletePushSubscription,
  checkNewEpisodesForWatching,
} from '../services/notification.service.js';

export const notificationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Todas as rotas de notificações exigem autenticação do Supabase
  fastify.addHook('preHandler', verifySupabaseAuth);

  // 1. GET /notifications — Lista notificações do usuário logado
  fastify.get('/', async (request, reply) => {
    const parseResult = getNotificationsQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Parâmetros de consulta inválidos.',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { page, limit, unreadOnly } = parseResult.data;
    const result = await getNotifications(request.userId, page, limit, unreadOnly);
    return reply.send(result);
  });

  // 2. GET /notifications/unread-count — Contador rápido para badge na Navbar
  fastify.get('/unread-count', async (request, reply) => {
    const count = await getUnreadCount(request.userId);
    return reply.send({ count });
  });

  // 3. PATCH /notifications/:id/read — Marca notificação como lida
  fastify.patch('/:id/read', async (request, reply) => {
    const parseResult = notificationIdParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'ID de notificação inválido.',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await markAsRead(request.userId, parseResult.data.id);
    return reply.send(result);
  });

  // 4. PATCH /notifications/read-all — Marca todas como lidas
  fastify.patch('/read-all', async (request, reply) => {
    const result = await markAllAsRead(request.userId);
    return reply.send(result);
  });

  // 5. POST /notifications/push-subscription — Salva inscrição Web Push
  fastify.post('/push-subscription', async (request, reply) => {
    const parseResult = savePushSubscriptionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados de inscrição Web Push inválidos.',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { endpoint, keys } = parseResult.data;
    await savePushSubscription(request.userId, endpoint, keys.p256dh, keys.auth);
    return reply.status(201).send({ success: true });
  });

  // 6. DELETE /notifications/push-subscription — Remove inscrição Web Push
  fastify.delete('/push-subscription', async (request, reply) => {
    const parseResult = deletePushSubscriptionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Dados de remoção de inscrição inválidos.',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const result = await deletePushSubscription(request.userId, parseResult.data.endpoint);
    return reply.send(result);
  });

  // 7. POST /notifications/check-episodes — Varre séries assistidas e gera alertas de novos episódios
  fastify.post('/check-episodes', async (request, reply) => {
    const result = await checkNewEpisodesForWatching(request.userId);
    return reply.send(result);
  });
};
