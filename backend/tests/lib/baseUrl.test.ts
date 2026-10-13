import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { getBaseUrl } from '../../src/lib/baseUrl.js';

describe('getBaseUrl Utility', () => {
  const originalEnv = process.env.BACKEND_URL;
  const originalPort = process.env.PORT;

  beforeEach(() => {
    delete process.env.BACKEND_URL;
    delete process.env.PORT;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.BACKEND_URL = originalEnv;
    } else {
      delete process.env.BACKEND_URL;
    }
    if (originalPort !== undefined) {
      process.env.PORT = originalPort;
    } else {
      delete process.env.PORT;
    }
  });

  it('deve priorizar process.env.BACKEND_URL quando definido, removendo barras finais', () => {
    process.env.BACKEND_URL = 'https://api.akasha.app/';
    const mockRequest = {
      headers: { host: 'evil-host.com' },
      protocol: 'http',
    } as unknown as FastifyRequest;

    expect(getBaseUrl(mockRequest)).toBe('https://api.akasha.app');
  });

  it('deve derivar a URL do request.headers.host quando BACKEND_URL não estiver definido', () => {
    const mockRequest = {
      headers: { host: 'meu-servidor.com:3000' },
      protocol: 'https',
    } as unknown as FastifyRequest;

    expect(getBaseUrl(mockRequest)).toBe('https://meu-servidor.com:3000');
  });

  it('deve considerar x-forwarded-proto se presente', () => {
    const mockRequest = {
      headers: {
        host: 'akasha.me',
        'x-forwarded-proto': 'https',
      },
      protocol: 'http',
    } as unknown as FastifyRequest;

    expect(getBaseUrl(mockRequest)).toBe('https://akasha.me');
  });

  it('deve fazer fallback para localhost:${PORT} se o host for inválido (proteção contra Host Header Poisoning)', () => {
    process.env.PORT = '4000';
    const mockRequest = {
      headers: { host: 'evil.com/malicious;inject' },
      protocol: 'https',
    } as unknown as FastifyRequest;

    expect(getBaseUrl(mockRequest)).toBe('http://localhost:4000');
  });

  it('deve retornar http://localhost:3000 se nenhum request for fornecido e sem PORT', () => {
    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});
