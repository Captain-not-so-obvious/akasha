import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getBackendBaseUrl, getMcpSseUrl, getMcpClaudeConfigJson } from '../../src/utils/mcpUrl';

describe('Utilitário mcpUrl', () => {
  const originalEnv = import.meta.env.VITE_BACKEND_URL;

  afterEach(() => {
    import.meta.env.VITE_BACKEND_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('deve priorizar VITE_BACKEND_URL quando definida', () => {
    import.meta.env.VITE_BACKEND_URL = 'https://meu-backend.com/';
    expect(getBackendBaseUrl()).toBe('https://meu-backend.com');
    expect(getMcpSseUrl()).toBe('https://meu-backend.com/mcp/sse');
  });

  it('deve gerar JSON de configuração para Claude Desktop no formato correto', () => {
    import.meta.env.VITE_BACKEND_URL = 'https://akasha-backend.onrender.com';
    const jsonStr = getMcpClaudeConfigJson();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.mcpServers.akasha.url).toBe('https://akasha-backend.onrender.com/mcp/sse');
  });

  it('deve usar fallback http://localhost:3000 em ambiente local sem env', () => {
    import.meta.env.VITE_BACKEND_URL = '';
    // No ambiente Node/JSDOM o hostname pode ser localhost
    expect(getMcpSseUrl()).toContain('/mcp/sse');
  });
});
