/**
 * Validador estrito de caminhos relativos seguros para prevenir Open Redirect.
 * Permite apenas rotas relativas internas que comecem com uma única barra '/',
 * e proíbe barras duplas '//', esquemas de protocolo (ex: 'javascript:', 'data:')
 * ou caracteres de escape de caminho.
 */
export function isSafeRelativePath(target?: string | null): boolean {
  if (!target || typeof target !== 'string') return false;

  const trimmed = target.trim();

  // Deve iniciar com barra única e não duas barras (que indicam URL absoluta no browser)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return false;
  }

  // Não pode conter dois pontos antes de '?' (evita javascript:, https:, etc.)
  const questionMarkIndex = trimmed.indexOf('?');
  const pathPart = questionMarkIndex !== -1 ? trimmed.slice(0, questionMarkIndex) : trimmed;
  if (pathPart.includes(':')) {
    return false;
  }

  // Não pode conter caracteres de controle
  if (/[\r\n\t]/.test(trimmed)) {
    return false;
  }

  return true;
}

export function getSafeRedirectUrl(target?: string | null, fallback = '/'): string {
  if (isSafeRelativePath(target)) {
    return target!.trim();
  }
  return fallback;
}
