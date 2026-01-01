import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    include: ['infra/**/*.{test,spec}.{ts,tsx}'],
    env: {
      SST_STAGE: 'test',
      SST_APP: 'shared-infra',
    },
    coverage: {
      provider: 'v8',
      reporter: [['lcov', { projectRoot: '../../' }], 'text'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
