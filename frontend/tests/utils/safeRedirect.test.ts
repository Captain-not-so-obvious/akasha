import { describe, it, expect } from 'vitest';
import { isSafeRelativePath, getSafeRedirectUrl } from '../../src/utils/safeRedirect';

describe('safeRedirect utility (SPEC-021)', () => {
  describe('isSafeRelativePath', () => {
    it('deve aceitar caminhos relativos legítimos', () => {
      expect(isSafeRelativePath('/biblioteca')).toBe(true);
      expect(isSafeRelativePath('/explorar')).toBe(true);
      expect(isSafeRelativePath('/oauth/authorize?client_id=spark')).toBe(true);
      expect(isSafeRelativePath('/perfil?tab=privacidade')).toBe(true);
    });

    it('deve rejeitar URLs absolutas com protocolo (http, https, javascript, data)', () => {
      expect(isSafeRelativePath('https://evil.com')).toBe(false);
      expect(isSafeRelativePath('http://malicious.org/phishing')).toBe(false);
      expect(isSafeRelativePath('javascript:alert(1)')).toBe(false);
      expect(isSafeRelativePath('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('deve rejeitar barras duplas ou URLs com esquema relativo de protocolo (//evil.com)', () => {
      expect(isSafeRelativePath('//evil.com')).toBe(false);
      expect(isSafeRelativePath('//evil.com/login')).toBe(false);
      expect(isSafeRelativePath('/\\evil.com')).toBe(false);
    });

    it('deve rejeitar caminhos que tentam injetar protocolo antes da query string', () => {
      expect(isSafeRelativePath('/test:something')).toBe(false);
    });

    it('deve rejeitar valores vazios, nulos ou indefinidos', () => {
      expect(isSafeRelativePath('')).toBe(false);
      expect(isSafeRelativePath(null)).toBe(false);
      expect(isSafeRelativePath(undefined)).toBe(false);
      expect(isSafeRelativePath('   ')).toBe(false);
    });
  });

  describe('getSafeRedirectUrl', () => {
    it('deve retornar a URL relativa se segura', () => {
      expect(getSafeRedirectUrl('/biblioteca')).toBe('/biblioteca');
    });

    it('deve retornar o fallback "/" quando a URL for maliciosa ou inválida', () => {
      expect(getSafeRedirectUrl('https://attacker.com/steal-session')).toBe('/');
      expect(getSafeRedirectUrl('//evil.com')).toBe('/');
      expect(getSafeRedirectUrl(null)).toBe('/');
    });
  });
});
