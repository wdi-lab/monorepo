import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // System tests should run sequentially to avoid conflicts
    fileParallelism: false,
    // Longer timeout for integration tests against deployed services
    testTimeout: 30000,
  },
});
