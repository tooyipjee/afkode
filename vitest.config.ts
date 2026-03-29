import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/main/**/*.ts'],
      exclude: ['src/main/index.ts'],
    },
  },
  resolve: {
    alias: {
      electron: resolve(__dirname, 'tests/__mocks__/electron.ts'),
      'electron-store': resolve(__dirname, 'tests/__mocks__/electron-store.ts'),
      'node-pty': resolve(__dirname, 'tests/__mocks__/node-pty.ts'),
    },
  },
});
