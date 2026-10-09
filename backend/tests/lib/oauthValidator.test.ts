import { describe, it, expect } from 'vitest';
import { escapeHtml, isAllowedRedirectUri, verifyCodeChallenge } from '../../src/lib/oauthValidator.js';
import crypto from 'node:crypto';

describe('oauthValidator', () => {
  describe('escapeHtml', () => {
    it('deve escapar caracteres perigosos contra XSS', () => {
      const malicious = '<script>alert("xss")</script>&foo=\'bar\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;foo=&#39;bar&#39;');
    });

    it('deve lidar com strings vazias', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('isAllowedRedirectUri', () => {
    it('deve permitir URIs canônicas do Claude', () => {
      expect(isAllowedRedirectUri('https://claude.ai/api/mcp/auth_callback')).toBe(true);
      expect(isAllowedRedirectUri('https://claude.com/api/mcp/auth_callback')).toBe(true);
    });

    it('deve rejeitar URIs maliciosas ou desconhecidas fora da allowlist', () => {
      expect(isAllowedRedirectUri('https://attacker.com/steal-token')).toBe(false);
      expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false);
    });
  });

  describe('verifyCodeChallenge (PKCE)', () => {
    it('deve validar corretamente desafio S256', () => {
      const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const challenge = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      expect(verifyCodeChallenge(verifier, challenge, 'S256')).toBe(true);
      expect(verifyCodeChallenge('wrong_verifier', challenge, 'S256')).toBe(false);
    });

    it('deve validar desafio plain', () => {
      expect(verifyCodeChallenge('my_secret', 'my_secret', 'plain')).toBe(true);
      expect(verifyCodeChallenge('my_secret', 'different', 'plain')).toBe(false);
    });
  });
});
