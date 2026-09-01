import { describe, it, expect } from 'vitest';
import { getReleaseYear } from '../../src/utils/date';

describe('getReleaseYear', () => {
  it('deve extrair o ano de quatro dígitos de uma data YYYY-MM-DD', () => {
    expect(getReleaseYear('1999-01-01')).toBe('1999');
    expect(getReleaseYear('2024-12-31')).toBe('2024');
  });

  it('deve retornar o ano quando passado apenas YYYY', () => {
    expect(getReleaseYear('2010')).toBe('2010');
  });

  it('deve retornar null para valores nulos, vazios ou indefinidos', () => {
    expect(getReleaseYear(null)).toBeNull();
    expect(getReleaseYear(undefined)).toBeNull();
    expect(getReleaseYear('')).toBeNull();
    expect(getReleaseYear('   ')).toBeNull();
  });

  it('deve retornar null para strings sem formato de ano válido', () => {
    expect(getReleaseYear('invalido')).toBeNull();
  });
});
