/**
 * Utilitário de sanitização de URLs para prevenir vazamento acidental de tokens e credenciais em logs (LGPD Art. 46).
 */
export function stripSensitiveQuery(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  const sensitiveKeys = new Set([
    'token',
    'access_token',
    'refresh_token',
    'code',
    'code_verifier',
    'code_challenge',
    'client_secret',
    'api_key',
    'apikey',
  ]);

  try {
    const [pathAndQuery, hash] = rawUrl.split('#');
    const [path, queryString] = pathAndQuery.split('?');

    if (!queryString) {
      return rawUrl;
    }

    const params = new URLSearchParams(queryString);
    let mutated = false;

    for (const key of params.keys()) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        params.set(key, '[REDACTED]');
        mutated = true;
      }
    }

    if (!mutated) {
      return rawUrl;
    }

    const reconstructed = `${path}?${params.toString()}${hash ? `#${hash}` : ''}`;
    return reconstructed;
  } catch {
    return rawUrl;
  }
}
