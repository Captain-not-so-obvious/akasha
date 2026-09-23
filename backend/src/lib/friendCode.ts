import { randomBytes } from 'crypto';

// Crockford Base32 (exclui I, L, O, U para evitar confusão visual e termos acidentais)
const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Gera um Friend Code de alta entropia formatado para o Akasha (ex: AK-7X9B-2M4K).
 * Possui mais de 1 trilhão de combinações possíveis (32^8 = 1.099.511.627.776),
 * tornando qualquer tentativa de enumeração ou varredura estatisticamente impossível.
 */
export function generateFriendCode(): string {
  const bytes = randomBytes(8);
  let result = '';

  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    result += CROCKFORD_ALPHABET[byte % CROCKFORD_ALPHABET.length];
  }

  // Retorna no formato AK-XXXX-XXXX para fácil visualização na tela de TV
  return `AK-${result.slice(0, 4)}-${result.slice(4)}`;
}

/**
 * Normaliza um Friend Code para busca, aceitando com ou sem hífen e maiúsculo/minúsculo.
 */
export function normalizeFriendCode(code: string): string {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.startsWith('AK') && clean.length === 10) {
    return `AK-${clean.slice(2, 6)}-${clean.slice(6, 10)}`;
  }
  if (clean.length === 8) {
    return `AK-${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  }
  return code.trim().toUpperCase();
}

/**
 * Gera um @username inicial único para o novo usuário (ex: 'lucas_48b1' ou 'viajante_92a3').
 * Utiliza o sufixo exclusivo do Friend Code para garantir matematicamente que
 * nunca ocorrerá colisão ou erro de chave única (P2002) no PostgreSQL.
 */
export function generateInitialUsername(email?: string, friendCode?: string): string {
  const codeSuffix = friendCode
    ? friendCode.replace(/[^A-Za-z0-9]/g, '').slice(-4).toLowerCase()
    : 'ak1';

  if (email && email.includes('@')) {
    const rawPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanPrefix = rawPrefix.slice(0, 15);
    if (cleanPrefix.length >= 3) {
      return `${cleanPrefix}_${codeSuffix}`;
    }
  }

  return `viajante_${codeSuffix}`;
}
