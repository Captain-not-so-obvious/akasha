import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom';

// Limpa o DOM após cada caso de teste
afterEach(() => {
  cleanup();
});
