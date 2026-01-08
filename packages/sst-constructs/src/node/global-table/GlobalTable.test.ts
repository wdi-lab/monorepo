import { describe, expect, test, vi, beforeEach } from 'vitest';

import 'sst/node/config';

declare module 'sst/node/config' {
  export interface GlobalTableResources {
    auth: { tableName: string };
    users: { tableName: string };
    'my-table': { tableName: string };
  }
}

describe('GlobalTable - node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Clear module cache to get fresh instance
    vi.resetModules();
  });

  describe('basic usage', () => {
    test('should return tableName from environment variable', async () => {
      vi.stubEnv('SST_GlobalTable_tableName_auth', 'dev-auth-table');

      const { GlobalTable } = await import('./GlobalTable.ts');

      expect(GlobalTable.auth.tableName).toBe('dev-auth-table');
    });

    test('should support multiple tables', async () => {
      vi.stubEnv('SST_GlobalTable_tableName_auth', 'dev-auth-table');
      vi.stubEnv('SST_GlobalTable_tableName_users', 'dev-users-table');

      const { GlobalTable } = await import('./GlobalTable.ts');

      expect(GlobalTable.auth.tableName).toBe('dev-auth-table');
      expect(GlobalTable.users.tableName).toBe('dev-users-table');
    });

    test('should throw error for unbound table', async () => {
      const { GlobalTable } = await import('./GlobalTable.ts');

      expect(() => {
        // @ts-expect-error - Testing runtime behavior for unbound table
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        GlobalTable.UnboundTable;
      }).toThrow(
        'Cannot use GlobalTable.UnboundTable. Please make sure it is bound to this function.'
      );
    });
  });

  describe('kebab-case normalization', () => {
    test('should normalize kebab-case property names to snake_case', async () => {
      vi.stubEnv('SST_GlobalTable_tableName_my_table', 'dev-my-table');

      const { GlobalTable } = await import('./GlobalTable.ts');

      // Access using kebab-case (declared as 'my-table' in GlobalTableResources)
      const value = GlobalTable['my-table'];

      expect(value.tableName).toBe('dev-my-table');
    });
  });

  describe('type safety', () => {
    test('should return object with tableName property', async () => {
      vi.stubEnv('SST_GlobalTable_tableName_auth', 'dev-auth-table');

      const { GlobalTable } = await import('./GlobalTable.ts');

      const table = GlobalTable.auth;

      // Should have tableName property
      expect(table).toHaveProperty('tableName');
      expect(typeof table.tableName).toBe('string');
    });
  });
});
