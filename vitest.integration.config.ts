import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    environment: 'node',
    setupFiles: ['./test/integration-setup.ts'],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    include: ['**/*.integration.test.ts'],
    // Run integration tests sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@arcqubit/shared': path.resolve(__dirname, './packages/shared/src'),
      '@arcqubit/database': path.resolve(__dirname, './packages/database/src'),
      '@arcqubit/auth': path.resolve(__dirname, './packages/auth/src'),
      '@arcqubit/documents': path.resolve(__dirname, './packages/documents/src'),
      '@arcqubit/workspaces': path.resolve(__dirname, './packages/workspaces/src'),
      '@arcqubit/pqc': path.resolve(__dirname, './packages/pqc/src'),
      '@arcqubit/ai': path.resolve(__dirname, './packages/ai/src'),
      '@arcqubit/search': path.resolve(__dirname, './packages/search/src'),
      '@arcqubit/compliance': path.resolve(__dirname, './packages/compliance/src'),
      '@arcqubit/cache': path.resolve(__dirname, './packages/cache/src'),
      '@arcqubit/jobs': path.resolve(__dirname, './packages/jobs/src'),
      '@arcqubit/plugins': path.resolve(__dirname, './packages/plugins/src'),
    },
  },
});
