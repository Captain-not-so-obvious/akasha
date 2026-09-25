import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotifications } from '../../src/hooks/useNotifications';
import * as apiModule from '../../src/lib/api';
import * as authModule from '../../src/hooks/useAuth';

vi.mock('../../src/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('Hook useNotifications (SPEC-007)', () => {
  const mockUser = {
    id: 'user-123',
    email: 'viajante@akasha.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: mockUser as any,
      signOut: vi.fn(),
      session: null,
      loading: false,
    });
  });

  it('deve carregar contador de não lidas e checar episódios na montagem', async () => {
    vi.mocked(apiModule.apiFetch).mockImplementation(async (endpoint) => {
      if (endpoint === '/notifications/unread-count') {
        return { ok: true, json: async () => ({ count: 3 }) } as Response;
      }
      if (endpoint === '/notifications/check-episodes') {
        return { ok: true, json: async () => ({ newEpisodesFound: 0 }) } as Response;
      }
      return { ok: false } as Response;
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchUnreadCount();
    });

    expect(result.current.unreadCount).toBe(3);
  });

  it('deve buscar lista de notificações com sucesso', async () => {
    const mockResponse = {
      notifications: [
        {
          id: 1,
          userId: 'user-123',
          type: 'NEW_EPISODE',
          title: 'Novo episódio',
          message: 'T01E01 disponível',
          data: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: {
        page: 1,
        limit: 30,
        total: 1,
        unreadCount: 1,
      },
    };

    vi.mocked(apiModule.apiFetch).mockImplementation(async (endpoint) => {
      if (typeof endpoint === 'string' && endpoint.startsWith('/notifications?')) {
        return { ok: true, json: async () => mockResponse } as Response;
      }
      return { ok: true, json: async () => ({ count: 1 }) } as Response;
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('deve marcar uma notificação como lida e decrementar o contador', async () => {
    const mockResponse = {
      notifications: [
        {
          id: 10,
          userId: 'user-123',
          type: 'FRIEND_RATED',
          title: 'Amigo avaliou',
          message: 'Nota 5',
          data: null,
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 30, total: 1, unreadCount: 1 },
    };

    vi.mocked(apiModule.apiFetch).mockImplementation(async (endpoint, options) => {
      if (endpoint === '/notifications/10/read' && options?.method === 'PATCH') {
        return { ok: true, json: async () => ({ id: 10, read: true }) } as Response;
      }
      if (typeof endpoint === 'string' && endpoint.startsWith('/notifications?')) {
        return { ok: true, json: async () => mockResponse } as Response;
      }
      return { ok: true, json: async () => ({ count: 1 }) } as Response;
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.notifications[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(1);

    await act(async () => {
      await result.current.markAsRead(10);
    });

    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('deve marcar todas como lidas e zerar contador', async () => {
    const mockResponse = {
      notifications: [
        { id: 1, read: false },
        { id: 2, read: false },
      ],
      pagination: { page: 1, limit: 30, total: 2, unreadCount: 2 },
    };

    vi.mocked(apiModule.apiFetch).mockImplementation(async (endpoint, options) => {
      if (endpoint === '/notifications/read-all' && options?.method === 'PATCH') {
        return { ok: true, json: async () => ({ count: 2 }) } as Response;
      }
      if (typeof endpoint === 'string' && endpoint.startsWith('/notifications?')) {
        return { ok: true, json: async () => mockResponse } as Response;
      }
      return { ok: true, json: async () => ({ count: 2 }) } as Response;
    });

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.fetchNotifications();
    });

    expect(result.current.unreadCount).toBe(2);

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });
});
