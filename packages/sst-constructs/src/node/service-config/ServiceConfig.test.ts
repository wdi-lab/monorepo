import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

import 'sst/node/config';

declare module 'sst/node/config' {
  export interface ServiceConfigResources {
    TestConfig: string;
    AnotherConfig: string;
    ExpiredConfig: string;
  }
}

const ssmMock = mockClient(SSMClient);

describe('ServiceConfig - node', () => {
  beforeEach(() => {
    ssmMock.reset();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Clear module cache to get fresh instance
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('on-demand SSM parameter fetching', () => {
    test('should fetch parameter from SSM when accessed', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          Value: 'test-value-from-ssm',
        },
      });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      const value = await ServiceConfig.TestConfig;

      expect(value).toBe('test-value-from-ssm');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
      expect(
        ssmMock.commandCalls(GetParameterCommand)[0].args[0].input
      ).toEqual({
        Name: '/service/test/dev/config',
        WithDecryption: true,
      });
    });

    test('should only fetch when property is accessed (lazy loading)', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          Value: 'test-value',
        },
      });

      // Just import, don't access any properties
      await import('./ServiceConfig.ts');

      // No SSM calls should have been made yet
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(0);
    });

    test('should throw error for unbound config', async () => {
      const { ServiceConfig } = await import('./ServiceConfig.ts');

      expect(() => {
        // @ts-expect-error - Testing runtime behavior for unbound config
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        ServiceConfig.UnboundConfig;
      }).toThrow(
        'Cannot use ServiceConfig.UnboundConfig. Please make sure it is bound to this function.'
      );
    });
  });

  describe('request deduplication', () => {
    test('should deduplicate concurrent requests for same parameter', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      let resolveSSM: (value: unknown) => void;
      const ssmPromise = new Promise((resolve) => {
        resolveSSM = resolve;
      });

      ssmMock.on(GetParameterCommand).callsFake(() => ssmPromise);

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // Make 5 concurrent requests
      const promises = [
        ServiceConfig.TestConfig,
        ServiceConfig.TestConfig,
        ServiceConfig.TestConfig,
        ServiceConfig.TestConfig,
        ServiceConfig.TestConfig,
      ];

      // Resolve the SSM call
      resolveSSM!({
        Parameter: {
          Value: 'deduped-value',
        },
      });

      const results = await Promise.all(promises);

      // All should get the same value
      expect(results).toEqual([
        'deduped-value',
        'deduped-value',
        'deduped-value',
        'deduped-value',
        'deduped-value',
      ]);

      // But only ONE SSM call should have been made
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
    });

    test('should not deduplicate requests for different parameters', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config1'
      );
      vi.stubEnv(
        'SST_ServiceConfig_value_AnotherConfig',
        '/service/test/dev/config2'
      );

      ssmMock
        .on(GetParameterCommand, {
          Name: '/service/test/dev/config1',
          WithDecryption: true,
        })
        .resolves({
          Parameter: {
            Value: 'value1',
          },
        })
        .on(GetParameterCommand, {
          Name: '/service/test/dev/config2',
          WithDecryption: true,
        })
        .resolves({
          Parameter: {
            Value: 'value2',
          },
        });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      const [value1, value2] = await Promise.all([
        ServiceConfig.TestConfig,
        ServiceConfig.AnotherConfig,
      ]);

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
    });
  });

  describe('caching', () => {
    test('should cache parameter value for 5 minutes', async () => {
      vi.useFakeTimers();
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          Value: 'cached-value',
        },
      });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // First access
      const value1 = await ServiceConfig.TestConfig;
      expect(value1).toBe('cached-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);

      // Advance time by 4 minutes (still within cache)
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Second access - should use cache
      const value2 = await ServiceConfig.TestConfig;
      expect(value2).toBe('cached-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1); // Still 1

      // Advance time by 2 more minutes (total 6 minutes - cache expired)
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Third access - should fetch from SSM again
      const value3 = await ServiceConfig.TestConfig;
      expect(value3).toBe('cached-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2); // New call
    });

    test('should update cache with new value after expiration', async () => {
      vi.useFakeTimers();
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock
        .on(GetParameterCommand)
        .resolvesOnce({
          Parameter: {
            Value: 'old-value',
          },
        })
        .resolvesOnce({
          Parameter: {
            Value: 'new-value',
          },
        });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // First access
      const value1 = await ServiceConfig.TestConfig;
      expect(value1).toBe('old-value');

      // Advance time past cache expiration
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second access - should fetch new value
      const value2 = await ServiceConfig.TestConfig;
      expect(value2).toBe('new-value');

      // Verify cache is updated - third access within cache window
      vi.advanceTimersByTime(1 * 60 * 1000);
      const value3 = await ServiceConfig.TestConfig;
      expect(value3).toBe('new-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
    });

    test('should cache independently for different parameters', async () => {
      vi.useFakeTimers();
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config1'
      );
      vi.stubEnv(
        'SST_ServiceConfig_value_AnotherConfig',
        '/service/test/dev/config2'
      );

      ssmMock
        .on(GetParameterCommand, {
          Name: '/service/test/dev/config1',
          WithDecryption: true,
        })
        .resolves({
          Parameter: {
            Value: 'value1',
          },
        })
        .on(GetParameterCommand, {
          Name: '/service/test/dev/config2',
          WithDecryption: true,
        })
        .resolves({
          Parameter: {
            Value: 'value2',
          },
        });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // Access first config
      await ServiceConfig.TestConfig;
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);

      // Advance time by 2 minutes before accessing second config
      vi.advanceTimersByTime(2 * 60 * 1000);

      // Access second config
      await ServiceConfig.AnotherConfig;
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);

      // Access again - should use cache
      await ServiceConfig.TestConfig;
      await ServiceConfig.AnotherConfig;
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);

      // Advance time by 3.5 minutes (total 5.5 for first, 3.5 for second)
      // This should expire only the first config (5.5 > 5, but 3.5 < 5)
      vi.advanceTimersByTime(3.5 * 60 * 1000);

      // Access both again - only first should refetch
      await ServiceConfig.TestConfig;
      await ServiceConfig.AnotherConfig;
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    test('should propagate SSM errors', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock
        .on(GetParameterCommand)
        .rejects(new Error('SSM service unavailable'));

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      await expect(ServiceConfig.TestConfig).rejects.toThrow(
        'SSM service unavailable'
      );
    });

    test('should not cache failed requests', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock
        .on(GetParameterCommand)
        .rejectsOnce(new Error('Temporary error'))
        .resolves({
          Parameter: {
            Value: 'success-value',
          },
        });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // First access fails
      try {
        await ServiceConfig.TestConfig;
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('Temporary error');
      }

      // Second access should retry and succeed
      const value = await ServiceConfig.TestConfig;
      expect(value).toBe('success-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
    });

    test('should handle missing parameter value', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          // No Value field
        },
      });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      const value = await ServiceConfig.TestConfig;
      expect(value).toBeUndefined();
    });

    test('should not cache undefined values', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      ssmMock
        .on(GetParameterCommand)
        .resolvesOnce({
          Parameter: {},
        })
        .resolves({
          Parameter: {
            Value: 'now-has-value',
          },
        });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // First access - no value
      const value1 = await ServiceConfig.TestConfig;
      expect(value1).toBeUndefined();

      // Wait for in-flight request to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second access - should fetch again since undefined was not cached
      const value2 = await ServiceConfig.TestConfig;
      expect(value2).toBe('now-has-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
    });
  });

  describe('decryption', () => {
    test('should request decryption of secure string parameters', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/secret'
      );

      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          Value: 'decrypted-secret-value',
        },
      });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      await ServiceConfig.TestConfig;

      const calls = ssmMock.commandCalls(GetParameterCommand);
      expect(calls[0].args[0].input.WithDecryption).toBe(true);
    });
  });

  describe('kebab-case normalization', () => {
    test('should normalize kebab-case property names to snake_case', async () => {
      vi.stubEnv(
        'SST_ServiceConfig_value_my_config',
        '/service/test/dev/my-config'
      );

      ssmMock.on(GetParameterCommand).resolves({
        Parameter: {
          Value: 'kebab-value',
        },
      });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // Access using kebab-case
      // @ts-expect-error - Testing runtime normalization
      const value = await ServiceConfig['my-config'];

      expect(value).toBe('kebab-value');
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
    });
  });

  describe('concurrent access with cache expiration', () => {
    test('should handle concurrent requests during cache expiration', async () => {
      vi.useFakeTimers();
      vi.stubEnv(
        'SST_ServiceConfig_value_TestConfig',
        '/service/test/dev/config'
      );

      let callCount = 0;
      ssmMock.on(GetParameterCommand).callsFake(() => {
        callCount++;
        return Promise.resolve({
          Parameter: {
            Value: `value-${callCount}`,
          },
        });
      });

      const { ServiceConfig } = await import('./ServiceConfig.ts');

      // First access - cache it
      const value1 = await ServiceConfig.TestConfig;
      expect(value1).toBe('value-1');

      // Expire cache
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Multiple concurrent requests after expiration
      const [value2, value3, value4] = await Promise.all([
        ServiceConfig.TestConfig,
        ServiceConfig.TestConfig,
        ServiceConfig.TestConfig,
      ]);

      // All should get the same new value
      expect(value2).toBe('value-2');
      expect(value3).toBe('value-2');
      expect(value4).toBe('value-2');

      // Only 2 SSM calls total (initial + after expiration)
      expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(2);
    });
  });
});
