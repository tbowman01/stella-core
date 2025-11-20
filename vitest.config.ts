import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        'test/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@arcqubit/shared': path.resolve(__dirname, './packages/shared/src'),
      '@arcqubit/database': path.resolve(__dirname, './packages/database/src'),
      '@arcqubit/auth': path.resolve(__dirname, './packages/auth/src'),
      '@arcqubit/documents': path.resolve(__dirname, './packages/documents/src'),
      '@arcqubit/compliance': path.resolve(__dirname, './packages/compliance/src'),
      '@arcqubit/pqc': path.resolve(__dirname, './packages/pqc/src'),
      '@arcqubit/workspaces': path.resolve(__dirname, './packages/workspaces/src'),
      '@arcqubit/search': path.resolve(__dirname, './packages/search/src'),
      '@arcqubit/ai': path.resolve(__dirname, './packages/ai/src'),
      '@arcqubit/plugins': path.resolve(__dirname, './packages/plugins/src'),
      '@arcqubit/cache': path.resolve(__dirname, './packages/cache/src'),
      '@arcqubit/jobs': path.resolve(__dirname, './packages/jobs/src'),
    },
  },
});
