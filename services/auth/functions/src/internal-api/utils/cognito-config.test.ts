import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const mockCognitoClient = mockClient(CognitoIdentityProviderClient);

describe('cognito-config', async () => {
  // mock config via env variables
  vi.stubEnv('SST_Parameter_value_COGNITO_USER_POOL_ID', 'test-pool-id');
  vi.stubEnv('SST_Parameter_value_COGNITO_CLIENT_ID', 'test-client-id');
  vi.stubEnv('SST_APP', 'test-client-id');

  // Import the module under test after setting up mocks
  const { getCognitoConfig, getCognitoClientSecret, resetCache } =
    await import('./cognito-config.ts');

  beforeEach(() => {
    mockCognitoClient.reset();
    resetCache();
  });

  describe('getCognitoConfig', () => {
    it('should return complete config', async () => {
      mockCognitoClient.on(DescribeUserPoolClientCommand).resolves({
        UserPoolClient: {
          ClientSecret: 'test-secret',
        },
      });

      const config = await getCognitoConfig();

      expect(config).toEqual({
        userPoolId: 'test-pool-id',
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
      });
    });
  });

  describe('getCognitoClientSecret', () => {
    it('should return client secret from API', async () => {
      mockCognitoClient.on(DescribeUserPoolClientCommand).resolves({
        UserPoolClient: {
          ClientSecret: 'api-secret',
        },
      });

      const secret = await getCognitoClientSecret('pool-id', 'client-id');

      expect(secret).toBe('api-secret');
      expect(mockCognitoClient.calls()).toHaveLength(1);
    });

    it('should cache results', async () => {
      mockCognitoClient.on(DescribeUserPoolClientCommand).resolves({
        UserPoolClient: {
          ClientSecret: 'cached-secret',
        },
      });

      // First call
      await getCognitoClientSecret('pool-id', 'client-id');

      // Second call - should use cache
      await getCognitoClientSecret('pool-id', 'client-id');

      // Should only have been called once
      expect(mockCognitoClient.calls()).toHaveLength(1);
    });

    it('should handle API errors', async () => {
      mockCognitoClient
        .on(DescribeUserPoolClientCommand)
        .rejects(new Error('API Error'));

      await expect(
        getCognitoClientSecret('pool-id', 'client-id')
      ).rejects.toThrow(
        'Failed to fetch Cognito client secret for user pool pool-id'
      );
    });

    it('should handle missing client secret in response', async () => {
      mockCognitoClient.on(DescribeUserPoolClientCommand).resolves({
        UserPoolClient: {},
      });

      await expect(
        getCognitoClientSecret('pool-id', 'client-id')
      ).rejects.toThrow(
        'Failed to fetch Cognito client secret for user pool pool-id'
      );
    });
  });
});
