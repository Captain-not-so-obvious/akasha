import { describe, it, expect } from 'vitest';
import { stripSensitiveQuery } from '../../src/lib/sanitizeUrl.js';

describe('stripSensitiveQuery', () => {
  it('deve retornar a URL intacta se não houver query string', () => {
    expect(stripSensitiveQuery('/mcp/sse')).toBe('/mcp/sse');
  });

  it('deve mascarar parâmetros sensíveis como token e code', () => {
    const raw = '/mcp/sse?token=xyz123secret&filter=all';
    const sanitized = stripSensitiveQuery(raw);
    expect(sanitized).toContain('token=%5BREDACTED%5D');
    expect(sanitized).toContain('filter=all');
    expect(sanitized).not.toContain('xyz123secret');
  });

  it('deve mascarar múltiplos parâmetros sensíveis indiferente de maiúsculas/minúsculas', () => {
    const raw = '/oauth/token?Code=abc&ACCESS_TOKEN=jwt.token.val&normal=ok';
    const sanitized = stripSensitiveQuery(raw);
    expect(sanitized).not.toContain('abc');
    expect(sanitized).not.toContain('jwt.token.val');
    expect(sanitized).toContain('normal=ok');
  });

  it('deve tratar strings vazias ou nulas com segurança', () => {
    expect(stripSensitiveQuery('')).toBe('');
  });
});
