import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/backend/**/*.ts'],
      exclude: ['src/backend/standalone.ts', 'src/backend/**/*.types.ts'],
    },
  },
});
