/**
 * Utilitários para resolução dinâmica das URLs do servidor MCP (Model Context Protocol)
 * e geração de snippets de configuração prontos para 1-Click Copy.
 */

export function getBackendBaseUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return 'https://akasha-backend.onrender.com';
  }

  return 'http://localhost:3000';
}

export function getMcpSseUrl(): string {
  return `${getBackendBaseUrl()}/mcp/sse`;
}

export function getMcpClaudeConfigJson(): string {
  const sseUrl = getMcpSseUrl();
  const config = {
    mcpServers: {
      akasha: {
        url: sseUrl,
      },
    },
  };
  return JSON.stringify(config, null, 2);
}
