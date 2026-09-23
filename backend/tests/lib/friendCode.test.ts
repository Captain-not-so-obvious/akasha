import { describe, it, expect } from 'vitest';
import {
  generateFriendCode,
  normalizeFriendCode,
  generateInitialUsername,
} from '../../src/lib/friendCode.js';

describe('Utilitário Friend Code (Segurança & Formatação)', () => {
  it('deve gerar um código no formato AK-XXXX-XXXX', () => {
    const code = generateFriendCode();
    expect(code).toMatch(/^AK-[0-9A-HJ-KM-NP-Z]{4}-[0-9A-HJ-KM-NP-Z]{4}$/);
  });

  it('deve gerar códigos únicos e não-repetitivos (entropia alta)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const code = generateFriendCode();
      expect(set.has(code)).toBe(false);
      set.add(code);
    }
    expect(set.size).toBe(100);
  });

  it('deve normalizar códigos sem hífen e minúsculos', () => {
    expect(normalizeFriendCode('ak41a899b2')).toBe('AK-41A8-99B2');
    expect(normalizeFriendCode('AK-41A8-99B2')).toBe('AK-41A8-99B2');
    expect(normalizeFriendCode('41a899b2')).toBe('AK-41A8-99B2');
  });

  it('deve gerar usernames iniciais únicos evitando colisão no banco de dados', () => {
    const user1 = generateInitialUsername('lucas@gmail.com', 'AK-1111-2222');
    const user2 = generateInitialUsername('lucas@hotmail.com', 'AK-3333-4444');
    const userSemEmail = generateInitialUsername(undefined, 'AK-5555-6666');

    expect(user1).toBe('lucas_2222');
    expect(user2).toBe('lucas_4444');
    expect(userSemEmail).toBe('viajante_6666');

    // Garante que mesmo com o mesmo prefixo de e-mail 'lucas', os usernames nunca colidem
    expect(user1).not.toBe(user2);
  });
});
