import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { notificationRoutes } from '../../src/routes/notification.routes.js';
import * as notificationService from '../../src/services/notification.service.js';

vi.mock('../../src/services/notification.service.js', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  savePushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  checkNewEpisodesForWatching: vi.fn(),
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  verifySupabaseAuth: vi.fn(async (request) => {
    request.userId = 'user-auth-123';
  }),
}));

describe('Integration: Notification Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    fastify = Fastify();
    await fastify.register(notificationRoutes, { prefix: '/notifications' });
    vi.clearAllMocks();
  });

  it('GET /notifications - deve retornar lista paginada de notificações', async () => {
    const mockData = {
      notifications: [
        {
          id: 1,
          userId: 'user-auth-123',
          type: 'FRIEND_RATED',
          title: 'amigo avaliou Matrix',
          message: 'Atribuiu 5 estrelas',
          data: { tmdbId: 603 },
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        unreadCount: 1,
      },
    };

    vi.mocked(notificationService.getNotifications).mockResolvedValue(mockData as any);

    const response = await fastify.inject({
      method: 'GET',
      url: '/notifications?page=1&limit=20',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.notifications).toHaveLength(1);
    expect(body.pagination.unreadCount).toBe(1);
    expect(notificationService.getNotifications).toHaveBeenCalledWith('user-auth-123', 1, 20, false);
  });

  it('GET /notifications/unread-count - deve retornar a contagem de não lidas', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);

    const response = await fastify.inject({
      method: 'GET',
      url: '/notifications/unread-count',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.count).toBe(5);
  });

  it('PATCH /notifications/:id/read - deve marcar notificação como lida', async () => {
    vi.mocked(notificationService.markAsRead).mockResolvedValue({
      id: 42,
      read: true,
      updated: true,
    } as any);

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/notifications/42/read',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.id).toBe(42);
    expect(body.read).toBe(true);
    expect(notificationService.markAsRead).toHaveBeenCalledWith('user-auth-123', 42);
  });

  it('PATCH /notifications/read-all - deve marcar todas as notificações como lidas', async () => {
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ count: 4 });

    const response = await fastify.inject({
      method: 'PATCH',
      url: '/notifications/read-all',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.count).toBe(4);
    expect(notificationService.markAllAsRead).toHaveBeenCalledWith('user-auth-123');
  });

  it('POST /notifications/push-subscription - deve registrar inscrição web push com sucesso', async () => {
    vi.mocked(notificationService.savePushSubscription).mockResolvedValue({} as any);

    const response = await fastify.inject({
      method: 'POST',
      url: '/notifications/push-subscription',
      payload: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
        keys: {
          p256dh: 'BNcRdreHzNmmsES4v...',
          auth: 'tBHItDaAhsZ...',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
  });

  it('DELETE /notifications/push-subscription - deve remover inscrição web push', async () => {
    vi.mocked(notificationService.deletePushSubscription).mockResolvedValue({ deleted: true });

    const response = await fastify.inject({
      method: 'DELETE',
      url: '/notifications/push-subscription',
      payload: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.deleted).toBe(true);
  });

  it('POST /notifications/check-episodes - deve verificar novos episódios', async () => {
    vi.mocked(notificationService.checkNewEpisodesForWatching).mockResolvedValue({ newEpisodesFound: 2 });

    const response = await fastify.inject({
      method: 'POST',
      url: '/notifications/check-episodes',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.newEpisodesFound).toBe(2);
    expect(notificationService.checkNewEpisodesForWatching).toHaveBeenCalledWith('user-auth-123');
  });
});
