import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  GetTokensFromRefreshTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { TokenRefreshService } from './token-refresh.ts';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

/**
 * Create a mock refresh token JWT
 *
 * Cognito refresh tokens are JWTs with the username in the payload.
 * This helper creates a valid-looking JWT structure for testing.
 */
function createMockRefreshToken(username: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ username })).toString(
    'base64url'
  );
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;

  beforeEach(() => {
    cognitoMock.reset();
    service = new TokenRefreshService({
      userPoolId: 'us-east-1_TEST123',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and return new access/id tokens', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      cognitoMock.on(GetTokensFromRefreshTokenCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'new-access-token-123',
          IdToken: 'new-id-token-456',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      });

      const result = await service.refresh({ refreshToken });

      expect(result).toEqual({
        accessToken: 'new-access-token-123',
        idToken: 'new-id-token-456',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      // Verify GetTokensFromRefreshToken was called correctly
      const calls = cognitoMock.commandCalls(GetTokensFromRefreshTokenCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input).toMatchObject({
        RefreshToken: refreshToken,
        ClientId: 'test-client-id',
        ClientSecret: expect.any(String),
      });
    });

    it('should use default values for expiresIn and tokenType if not provided', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      cognitoMock.on(GetTokensFromRefreshTokenCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'new-access-token-123',
          IdToken: 'new-id-token-456',
          // ExpiresIn and TokenType not provided
        },
      });

      const result = await service.refresh({ refreshToken });

      expect(result).toEqual({
        accessToken: 'new-access-token-123',
        idToken: 'new-id-token-456',
        expiresIn: 3600, // Default
        tokenType: 'Bearer', // Default
      });
    });

    it('should throw error if access token is missing', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      cognitoMock.on(GetTokensFromRefreshTokenCommand).resolves({
        AuthenticationResult: {
          // AccessToken missing
          IdToken: 'new-id-token-456',
        },
      });

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        'Failed to refresh tokens. Please log in again.'
      );
    });

    it('should throw error if id token is missing', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      cognitoMock.on(GetTokensFromRefreshTokenCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'new-access-token-123',
          // IdToken missing
        },
      });

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        'Failed to refresh tokens. Please log in again.'
      );
    });

    it('should throw specific error for expired/invalid refresh token', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      const error = new Error('Refresh token has expired');
      error.name = 'NotAuthorizedException';

      cognitoMock.on(GetTokensFromRefreshTokenCommand).rejects(error);

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        'Refresh token is invalid or expired'
      );
    });

    it('should throw specific error for user not found', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      const error = new Error('User does not exist');
      error.name = 'UserNotFoundException';

      cognitoMock.on(GetTokensFromRefreshTokenCommand).rejects(error);

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw generic error for other failures', async () => {
      const username = 'test@example.com';
      const refreshToken = createMockRefreshToken(username);

      cognitoMock
        .on(GetTokensFromRefreshTokenCommand)
        .rejects(new Error('Network error'));

      await expect(service.refresh({ refreshToken })).rejects.toThrow(
        'Failed to refresh tokens. Please log in again.'
      );
    });

    it('should throw error for invalid refresh token format', async () => {
      const invalidToken = 'not-a-valid-jwt';

      await expect(
        service.refresh({ refreshToken: invalidToken })
      ).rejects.toThrow('Failed to refresh tokens. Please log in again.');
    });

    it('should throw error if username not found in token payload', async () => {
      // Create a token without username
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
        'base64url'
      );
      const payload = Buffer.from(JSON.stringify({ sub: 'some-id' })).toString(
        'base64url'
      );
      const invalidToken = `${header}.${payload}.signature`;

      await expect(
        service.refresh({ refreshToken: invalidToken })
      ).rejects.toThrow('Failed to refresh tokens. Please log in again.');
    });

    it('should handle cognito:username claim as fallback', async () => {
      // Create a token with cognito:username instead of username
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
        'base64url'
      );
      const payload = Buffer.from(
        JSON.stringify({ 'cognito:username': 'test@example.com' })
      ).toString('base64url');
      const refreshToken = `${header}.${payload}.signature`;

      cognitoMock.on(GetTokensFromRefreshTokenCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'new-access-token-123',
          IdToken: 'new-id-token-456',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      });

      const result = await service.refresh({ refreshToken });

      expect(result.accessToken).toBe('new-access-token-123');
    });
  });
});
