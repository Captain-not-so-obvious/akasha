import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  savePushSubscription,
  deletePushSubscription,
  notifyFriendsOnRating,
  notifyFriendRequest,
  notifyFriendAccepted,
  checkNewEpisodesForWatching,
} from '../../src/services/notification.service.js';
import { prisma } from '../../src/lib/prisma.js';
import * as tmdbService from '../../src/services/tmdb.service.js';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    pushSubscription: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    friendship: {
      findMany: vi.fn(),
    },
    wishlist: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/tmdb.service.js', () => ({
  fetchTvLatestEpisode: vi.fn(),
}));

describe('Notification Service - Unit Tests', () => {
  const mockUserId = 'user-uuid-1';
  const mockFriendId = 'user-uuid-2';
  const mockBlockedId = 'user-uuid-3';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('deve criar uma notificação no banco de dados com os dados corretos', async () => {
      const mockCreated = {
        id: 1,
        userId: mockUserId,
        type: 'SYSTEM' as const,
        title: 'Bem-vindo ao Akasha',
        message: 'Explore suas mídias favoritas.',
        data: null,
        read: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockCreated);

      const result = await createNotification({
        userId: mockUserId,
        type: 'SYSTEM',
        title: 'Bem-vindo ao Akasha',
        message: 'Explore suas mídias favoritas.',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          type: 'SYSTEM',
          title: 'Bem-vindo ao Akasha',
        }),
      });
      expect(result.id).toBe(1);
    });
  });

  describe('getNotifications & getUnreadCount', () => {
    it('deve retornar notificações paginadas com contagem total e não lidas', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: mockUserId,
          type: 'NEW_EPISODE' as const,
          title: 'Novo episódio de Succession',
          message: 'T04E03 disponível',
          data: {},
          read: false,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications);
      vi.mocked(prisma.notification.count)
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await getNotifications(mockUserId, 1, 10, false);

      expect(result.notifications).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.unreadCount).toBe(1);
    });

    it('deve retornar contagem de não lidas corretamente', async () => {
      vi.mocked(prisma.notification.count).mockResolvedValue(4);
      const count = await getUnreadCount(mockUserId);
      expect(count).toBe(4);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, read: false },
      });
    });
  });

  describe('markAsRead & markAllAsRead', () => {
    it('deve marcar uma notificação específica como lida', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });
      const result = await markAsRead(mockUserId, 42);
      expect(result.read).toBe(true);
      expect(result.updated).toBe(true);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 42, userId: mockUserId },
        data: { read: true },
      });
    });

    it('deve marcar todas as notificações do usuário como lidas', async () => {
      vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });
      const result = await markAllAsRead(mockUserId);
      expect(result.count).toBe(5);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, read: false },
        data: { read: true },
      });
    });
  });

  describe('savePushSubscription & deletePushSubscription', () => {
    it('deve salvar ou atualizar a inscrição push via upsert', async () => {
      const mockSub = {
        id: 1,
        userId: mockUserId,
        endpoint: 'https://push.example.com/sub/123',
        p256dh: 'key_p256dh',
        auth: 'key_auth',
        createdAt: new Date(),
      };

      vi.mocked(prisma.pushSubscription.upsert).mockResolvedValue(mockSub);

      const result = await savePushSubscription(
        mockUserId,
        'https://push.example.com/sub/123',
        'key_p256dh',
        'key_auth'
      );

      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: 'https://push.example.com/sub/123' },
        update: { userId: mockUserId, p256dh: 'key_p256dh', auth: 'key_auth' },
        create: {
          userId: mockUserId,
          endpoint: 'https://push.example.com/sub/123',
          p256dh: 'key_p256dh',
          auth: 'key_auth',
        },
      });
      expect(result.endpoint).toBe('https://push.example.com/sub/123');
    });

    it('deve remover inscrição push', async () => {
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 1 });
      const result = await deletePushSubscription(mockUserId, 'https://push.example.com/sub/123');
      expect(result.deleted).toBe(true);
    });
  });

  describe('notifyFriendsOnRating', () => {
    it('deve notificar amigos bilaterais aceitos e excluir bloqueados', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: mockUserId,
        username: 'cinefilo_mor',
        avatarUrl: 'https://avatar.png',
        email: 'cinefilo@akasha.com',
        friendCode: 'AK-1111-2222',
        updatedAt: new Date(),
      });

      // Amizades aceitas: mockFriendId e mockBlockedId
      vi.mocked(prisma.friendship.findMany)
        .mockResolvedValueOnce([
          {
            id: 10,
            requesterId: mockUserId,
            addresseeId: mockFriendId,
            status: 'accepted',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 11,
            requesterId: mockBlockedId,
            addresseeId: mockUserId,
            status: 'accepted',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        // Bloqueados: mockBlockedId
        .mockResolvedValueOnce([
          {
            id: 12,
            requesterId: mockUserId,
            addresseeId: mockBlockedId,
            status: 'blocked',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 99,
        userId: mockFriendId,
        type: 'FRIEND_RATED',
        title: 'cinefilo_mor avaliou Duna: Parte 2',
        message: 'Atribuiu 5 estrelas: "Obra-prima!"',
        data: {},
        read: false,
        createdAt: new Date(),
      });

      const results = await notifyFriendsOnRating(
        mockUserId,
        693134,
        'movie',
        5,
        'Obra-prima!',
        'Duna: Parte 2',
        '/duna.jpg'
      );

      // Deve notificar apenas mockFriendId, nunca mockBlockedId
      expect(results).toHaveLength(1);
      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockFriendId,
          type: 'FRIEND_RATED',
          title: 'cinefilo_mor avaliou Duna: Parte 2',
        }),
      });
    });
  });

  describe('notifyFriendRequest & notifyFriendAccepted', () => {
    it('deve disparar notificação de solicitação de amizade recebida', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: mockUserId,
        username: 'viajante_alfa',
        avatarUrl: null,
        email: null,
        friendCode: 'AK-3333-4444',
        updatedAt: new Date(),
      });

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 101,
        userId: mockFriendId,
        type: 'FRIEND_REQUEST',
        title: 'Nova solicitação de amizade',
        message: 'viajante_alfa enviou uma solicitação de amizade para se conectar no Akasha.',
        data: {},
        read: false,
        createdAt: new Date(),
      });

      const res = await notifyFriendRequest(mockUserId, mockFriendId);
      expect(res.type).toBe('FRIEND_REQUEST');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockFriendId,
          type: 'FRIEND_REQUEST',
        }),
      });
    });

    it('deve disparar notificação de amizade aceita', async () => {
      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: mockFriendId,
        username: 'viajante_beta',
        avatarUrl: null,
        email: null,
        friendCode: 'AK-5555-6666',
        updatedAt: new Date(),
      });

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 102,
        userId: mockUserId,
        type: 'FRIEND_ACCEPTED',
        title: 'Solicitação de amizade aceita',
        message: 'viajante_beta aceitou sua solicitação.',
        data: {},
        read: false,
        createdAt: new Date(),
      });

      const res = await notifyFriendAccepted(mockUserId, mockFriendId);
      expect(res.type).toBe('FRIEND_ACCEPTED');
    });
  });

  describe('checkNewEpisodesForWatching', () => {
    it('deve detectar novo episódio exibido recentemente e gerar notificação NEW_EPISODE', async () => {
      const today = new Date();
      const recentAirDate = today.toISOString().split('T')[0];

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          tmdbId: 85271, // WandaVision
          mediaType: 'tv',
          status: 'watching',
          userRating: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tmdbService.fetchTvLatestEpisode).mockResolvedValue({
        id: 9991,
        name: 'O Grande Final',
        overview: 'Conclusão da temporada',
        airDate: recentAirDate,
        episodeNumber: 9,
        seasonNumber: 1,
        stillUrl: '/still.jpg',
        seriesTitle: 'WandaVision',
        posterUrl: '/poster.jpg',
      });

      // Não existe notificação prévia deste episódio
      vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.notification.create).mockResolvedValue({
        id: 105,
        userId: mockUserId,
        type: 'NEW_EPISODE',
        title: 'Novo episódio de WandaVision',
        message: 'T01E09: "O Grande Final" já está disponível!',
        data: {},
        read: false,
        createdAt: new Date(),
      });

      const result = await checkNewEpisodesForWatching(mockUserId);

      expect(result.newEpisodesFound).toBe(1);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          type: 'NEW_EPISODE',
          title: 'Novo episódio de WandaVision',
        }),
      });
    });

    it('não deve duplicar notificação se o episódio já foi notificado anteriormente', async () => {
      const today = new Date();
      const recentAirDate = today.toISOString().split('T')[0];

      vi.mocked(prisma.wishlist.findMany).mockResolvedValue([
        {
          id: 1,
          userId: mockUserId,
          tmdbId: 85271,
          mediaType: 'tv',
          status: 'watching',
          userRating: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      vi.mocked(tmdbService.fetchTvLatestEpisode).mockResolvedValue({
        id: 9991,
        name: 'O Grande Final',
        overview: 'Conclusão da temporada',
        airDate: recentAirDate,
        episodeNumber: 9,
        seasonNumber: 1,
        stillUrl: '/still.jpg',
        seriesTitle: 'WandaVision',
        posterUrl: '/poster.jpg',
      });

      // Já existe notificação deste episódio no banco
      vi.mocked(prisma.notification.findFirst).mockResolvedValue({
        id: 105,
        userId: mockUserId,
        type: 'NEW_EPISODE',
        title: 'Novo episódio de WandaVision',
        message: 'Já existe',
        data: { episodeId: 9991 },
        read: false,
        createdAt: new Date(),
      });

      const result = await checkNewEpisodesForWatching(mockUserId);

      expect(result.newEpisodesFound).toBe(0);
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
