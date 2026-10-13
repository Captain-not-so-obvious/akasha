import type { FastifyRequest } from 'fastify';

/**
 * Utilitário centralizado para obter a URL base canônica do backend.
 *
 * Ordem de prioridade:
 * 1. `process.env.BACKEND_URL`: Variável explícita no ambiente (.env), sem barras finais.
 * 2. Dinâmica via cabeçalho inspecionado: protocolo + host validado contra Host Header Poisoning.
 * 3. Fallback neutro: `http://localhost:${PORT || 3000}`.
 *
 * Previne Host Header Poisoning e elimina domínios chumbados de provedores de nuvem (KISS & 12-Factor App).
 */
export function getBaseUrl(request?: FastifyRequest): string {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }

  const defaultPort = process.env.PORT || '3000';
  const defaultFallback = `http://localhost:${defaultPort}`;

  if (!request) {
    return defaultFallback;
  }

  const rawHost = request.headers.host;
  if (!rawHost) {
    return defaultFallback;
  }

  // Validação estrita contra caracteres de controle, quebras de linha ou injeções de cabeçalho
  const isValidHost = /^[a-zA-Z0-9.:-]+$/.test(rawHost);
  if (!isValidHost) {
    return defaultFallback;
  }

  const protocol = (request.headers['x-forwarded-proto'] as string | undefined) || request.protocol || 'http';
  return `${protocol}://${rawHost}`;
}
