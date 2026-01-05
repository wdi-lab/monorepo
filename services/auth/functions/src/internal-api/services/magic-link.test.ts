import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { MagicLinkService } from './magic-link.ts';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('MagicLinkService', () => {
  let service: MagicLinkService;

  beforeEach(() => {
    cognitoMock.reset();
    service = new MagicLinkService({
      userPoolId: 'us-east-1_TEST123',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  describe('initiate', () => {
    it('should initiate magic link flow and return session', async () => {
      const email = 'test@example.com';
      const redirectUri = 'https://example.com/auth/magic-link';

      // Mock the InitiateAuth response
      cognitoMock.on(InitiateAuthCommand).resolves({
        Session: 'initial-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      // Mock the RespondToAuthChallenge response
      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        Session: 'challenge-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      const result = await service.initiate({ email, redirectUri });

      expect(result).toEqual({
        session: 'challenge-session-token',
        message: 'Magic link sent to your email. Please check your inbox.',
      });

      // Verify InitiateAuth was called correctly
      const initiateCalls = cognitoMock.commandCalls(InitiateAuthCommand);
      expect(initiateCalls).toHaveLength(1);
      expect(initiateCalls[0].args[0].input).toMatchObject({
        ClientId: 'test-client-id',
        AuthFlow: 'CUSTOM_AUTH',
        AuthParameters: {
          USERNAME: email,
          SECRET_HASH: expect.any(String),
        },
      });

      // Verify RespondToAuthChallenge was called correctly
      const challengeCalls = cognitoMock.commandCalls(
        RespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(1);
      expect(challengeCalls[0].args[0].input).toMatchObject({
        ClientId: 'test-client-id',
        ChallengeName: 'CUSTOM_CHALLENGE',
        Session: 'initial-session-token',
        ChallengeResponses: {
          USERNAME: email,
          ANSWER: '__dummy__',
          SECRET_HASH: expect.any(String),
        },
        ClientMetadata: {
          signInMethod: 'MAGIC_LINK',
          redirectUri,
          alreadyHaveMagicLink: 'no',
        },
      });
    });

    it('should throw error if InitiateAuth fails without session', async () => {
      const email = 'test@example.com';
      const redirectUri = 'https://example.com/auth/magic-link';

      cognitoMock.on(InitiateAuthCommand).resolves({
        // No Session field
      });

      await expect(service.initiate({ email, redirectUri })).rejects.toThrow(
        'Failed to send magic link. Please try again.'
      );
    });

    it('should throw error if RespondToAuthChallenge fails without session', async () => {
      const email = 'test@example.com';
      const redirectUri = 'https://example.com/auth/magic-link';

      cognitoMock.on(InitiateAuthCommand).resolves({
        Session: 'initial-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        // No Session field
      });

      await expect(service.initiate({ email, redirectUri })).rejects.toThrow(
        'Failed to send magic link. Please try again.'
      );
    });
  });

  describe('complete', () => {
    it('should complete magic link flow and return tokens', async () => {
      const session = 'challenge-session-token';
      // Create a valid secret (base64url encoded message + signature)
      const message = JSON.stringify({ userName: 'test@example.com' });
      const messageB64 = Buffer.from(message).toString('base64url');
      const secret = `${messageB64}.signature`;

      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'access-token-123',
          IdToken: 'id-token-456',
          RefreshToken: 'refresh-token-789',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      });

      const result = await service.complete({ session, secret });

      expect(result).toEqual({
        accessToken: 'access-token-123',
        idToken: 'id-token-456',
        refreshToken: 'refresh-token-789',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      // Verify RespondToAuthChallenge was called correctly
      const challengeCalls = cognitoMock.commandCalls(
        RespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(1);
      expect(challengeCalls[0].args[0].input).toMatchObject({
        ClientId: 'test-client-id',
        ChallengeName: 'CUSTOM_CHALLENGE',
        Session: session,
        ChallengeResponses: {
          USERNAME: 'test@example.com',
          ANSWER: secret,
          SECRET_HASH: expect.any(String),
        },
        ClientMetadata: {
          signInMethod: 'MAGIC_LINK',
          alreadyHaveMagicLink: 'yes',
        },
      });
    });

    it('should include redirectUri in complete flow metadata', async () => {
      const session = 'challenge-session-token';
      const redirectUri = 'https://example.com/auth/magic-link';
      const message = JSON.stringify({ userName: 'test@example.com' });
      const messageB64 = Buffer.from(message).toString('base64url');
      const secret = `${messageB64}.signature`;

      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'access-token-123',
          IdToken: 'id-token-456',
          RefreshToken: 'refresh-token-789',
          ExpiresIn: 3600,
          TokenType: 'Bearer',
        },
      });

      const result = await service.complete({ session, secret, redirectUri });

      expect(result).toEqual({
        accessToken: 'access-token-123',
        idToken: 'id-token-456',
        refreshToken: 'refresh-token-789',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      // Verify RespondToAuthChallenge was called with redirectUri in metadata
      const challengeCalls = cognitoMock.commandCalls(
        RespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(1);
      expect(challengeCalls[0].args[0].input).toMatchObject({
        ClientId: 'test-client-id',
        ChallengeName: 'CUSTOM_CHALLENGE',
        Session: session,
        ChallengeResponses: {
          USERNAME: 'test@example.com',
          ANSWER: secret,
          SECRET_HASH: expect.any(String),
        },
        ClientMetadata: {
          signInMethod: 'MAGIC_LINK',
          redirectUri,
          alreadyHaveMagicLink: 'yes',
        },
      });
    });

    it('should throw error if tokens are missing', async () => {
      const session = 'challenge-session-token';
      const message = JSON.stringify({ userName: 'test@example.com' });
      const messageB64 = Buffer.from(message).toString('base64url');
      const secret = `${messageB64}.signature`;

      cognitoMock.on(RespondToAuthChallengeCommand).resolves({
        AuthenticationResult: {
          // Missing required tokens
        },
      });

      await expect(service.complete({ session, secret })).rejects.toThrow(
        'Invalid or expired magic link. Please request a new one.'
      );
    });

    it('should throw error if authentication fails', async () => {
      const session = 'challenge-session-token';
      const message = JSON.stringify({ userName: 'test@example.com' });
      const messageB64 = Buffer.from(message).toString('base64url');
      const secret = `${messageB64}.signature`;

      const error = new Error('Invalid session');
      error.name = 'NotAuthorizedException';

      cognitoMock.on(RespondToAuthChallengeCommand).rejects(error);

      await expect(service.complete({ session, secret })).rejects.toThrow(
        'Invalid or expired magic link. Please request a new one.'
      );
    });
  });
});
