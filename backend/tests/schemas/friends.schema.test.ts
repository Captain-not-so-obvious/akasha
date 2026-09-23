import { describe, it, expect } from 'vitest';
import {
  sendFriendRequestSchema,
  respondFriendRequestSchema,
  friendshipParamSchema,
  friendParamSchema,
  updateProfileSchema,
} from '../../src/schemas/friends.schema.js';

describe('Validação Zod - Camada Social (SPEC-002)', () => {
  describe('sendFriendRequestSchema', () => {
    it('deve aceitar e-mails válidos', () => {
      const res = sendFriendRequestSchema.safeParse({ target: 'amigo@akasha.com' });
      expect(res.success).toBe(true);
    });

    it('deve aceitar usernames com @ ou sem @', () => {
      expect(sendFriendRequestSchema.safeParse({ target: '@cinefilo' }).success).toBe(true);
      expect(sendFriendRequestSchema.safeParse({ target: 'cinefilo' }).success).toBe(true);
    });

    it('deve aceitar Friend Code formatado', () => {
      expect(sendFriendRequestSchema.safeParse({ target: 'AK-48B1-92A3' }).success).toBe(true);
    });

    it('deve rejeitar identificadores com menos de 3 caracteres', () => {
      const res = sendFriendRequestSchema.safeParse({ target: 'ab' });
      expect(res.success).toBe(false);
    });

    it('deve rejeitar identificadores vazios ou com apenas espaços', () => {
      const res = sendFriendRequestSchema.safeParse({ target: '   ' });
      expect(res.success).toBe(false);
    });
  });

  describe('respondFriendRequestSchema', () => {
    it('deve aceitar ações permitidas: accept, decline, block', () => {
      expect(respondFriendRequestSchema.safeParse({ action: 'accept' }).success).toBe(true);
      expect(respondFriendRequestSchema.safeParse({ action: 'decline' }).success).toBe(true);
      expect(respondFriendRequestSchema.safeParse({ action: 'block' }).success).toBe(true);
    });

    it('deve rejeitar qualquer outra ação desconhecida', () => {
      const res = respondFriendRequestSchema.safeParse({ action: 'delete' });
      expect(res.success).toBe(false);
    });
  });

  describe('friendshipParamSchema e friendParamSchema', () => {
    it('deve aceitar ID numérico inteiro positivo para solicitação', () => {
      expect(friendshipParamSchema.safeParse({ id: '15' }).success).toBe(true);
    });

    it('deve rejeitar ID não-numérico ou negativo para solicitação', () => {
      expect(friendshipParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
      expect(friendshipParamSchema.safeParse({ id: '-5' }).success).toBe(false);
    });

    it('deve aceitar UUID válido para ID de amigo', () => {
      expect(
        friendParamSchema.safeParse({ id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' }).success
      ).toBe(true);
    });

    it('deve rejeitar string que não seja UUID para ID de amigo', () => {
      expect(friendParamSchema.safeParse({ id: '123' }).success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('deve aceitar username com formato alfanumérico e hifens', () => {
      expect(updateProfileSchema.safeParse({ username: 'alex_99' }).success).toBe(true);
      expect(updateProfileSchema.safeParse({ username: 'neo-matrix' }).success).toBe(true);
    });

    it('deve rejeitar username com caracteres especiais inválidos como espaços ou barras', () => {
      expect(updateProfileSchema.safeParse({ username: 'alex 99' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ username: 'neo/matrix' }).success).toBe(false);
    });

    it('deve aceitar imagens raster locais (data:image) e origens oficiais seguras', () => {
      // Aceita upload local codificado em base64
      expect(
        updateProfileSchema.safeParse({
          avatarUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
        }).success
      ).toBe(true);
      expect(
        updateProfileSchema.safeParse({
          avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
        }).success
      ).toBe(true);

      // Aceita avatares temáticos oficiais do Akasha (DiceBear)
      expect(
        updateProfileSchema.safeParse({
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=AkashaOracle',
        }).success
      ).toBe(true);

      // Aceita foto oficial da conta Google (Google OAuth)
      expect(
        updateProfileSchema.safeParse({
          avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocKX-test-avatar',
        }).success
      ).toBe(true);

      // Permite null (para remover foto)
      expect(updateProfileSchema.safeParse({ avatarUrl: null }).success).toBe(true);
    });

    it('deve rejeitar URLs externas arbitrárias para prevenir injeção de scripts e rastreamento', () => {
      // Rejeita links arbitrários da web para segurança
      expect(updateProfileSchema.safeParse({ avatarUrl: 'https://evil.com/xss.svg' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ avatarUrl: 'https://meusite.com/foto.jpg' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ avatarUrl: 'http://tracker.io/pixel.png' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ avatarUrl: 'javascript:alert(1)' }).success).toBe(false);
    });
  });
});
