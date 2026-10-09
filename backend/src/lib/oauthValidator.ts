import crypto from 'node:crypto';

/**
 * Escapa strings para renderização segura dentro de templates HTML.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validação de redirect_uri contra allowlist configurável e origens canônicas do ecossistema MCP.
 */
export function isAllowedRedirectUri(rawUri: string): boolean {
  if (!rawUri || typeof rawUri !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(rawUri);
  } catch {
    return false;
  }

  // Allowlist canônica oficial
  const canonicalAllowed = [
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
  ];

  // Adicionar origens de ambiente
  const envAllowed = (process.env.MCP_ALLOWED_REDIRECT_URIS || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  const fullAllowedList = [...canonicalAllowed, ...envAllowed];

  // Verificação exata na allowlist
  for (const allowed of fullAllowedList) {
    if (rawUri === allowed) return true;
  }

  // Em desenvolvimento, permitir localhost e 127.0.0.1 em portas locais
  if (process.env.NODE_ENV !== 'production') {
    if (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
    ) {
      return true;
    }
  }

  // Permitir frontend do Akasha configurado no FRONTEND_URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const frontendOrigin = new URL(frontendUrl).origin;
    if (parsed.origin === frontendOrigin) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Valida o code_verifier do PKCE (S256) contra o code_challenge.
 */
export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method = 'S256'
): boolean {
  if (!codeVerifier || !codeChallenge) return false;

  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  }

  if (method === 'S256') {
    const hash = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    return hash === codeChallenge;
  }

  return false;
}
