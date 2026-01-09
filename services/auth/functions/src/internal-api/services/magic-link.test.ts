import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { MagicLinkService } from './magic-link.ts';
import { UserService } from './user.ts';

// Mock UserService
vi.mock('./user.ts', () => ({
  UserService: vi.fn().mockImplementation(() => ({
    findOrCreateUser: vi.fn().mockResolvedValue({
      id: 'ulid-123',
      email: 'test@example.com',
      version: 1,
      emailVerified: false,
      cognitoUsers: [],
    }),
    setEmailVerified: vi.fn().mockResolvedValue(undefined),
  })),
}));

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('MagicLinkService', () => {
  let service: MagicLinkService;
  let mockUserService: {
    findOrCreateUser: ReturnType<typeof vi.fn>;
    setEmailVerified: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cognitoMock.reset();
    vi.clearAllMocks();
    mockUserService = {
      findOrCreateUser: vi.fn().mockResolvedValue({
        id: 'ulid-123',
        email: 'test@example.com',
        version: 1,
        emailVerified: false,
        cognitoUsers: [],
      }),
      setEmailVerified: vi.fn().mockResolvedValue(undefined),
    };
    service = new MagicLinkService(
      {
        userPoolId: 'us-east-1_TEST123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      },
      mockUserService as unknown as UserService
    );
  });

  describe('initiate', () => {
    it('should initiate magic link flow and return session', async () => {
      const email = 'test@example.com';
      const redirectUri = 'https://example.com/auth/magic-link';

      // Mock the AdminInitiateAuth response
      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        Session: 'initial-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      // Mock the AdminRespondToAuthChallenge response
      cognitoMock.on(AdminRespondToAuthChallengeCommand).resolves({
        Session: 'challenge-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      const result = await service.initiate({ username: email, redirectUri });

      expect(result).toEqual({
        session: 'challenge-session-token',
        message: 'Magic link sent to your email. Please check your inbox.',
      });

      // Verify UserService.findOrCreateUser was called before Cognito calls
      expect(mockUserService.findOrCreateUser).toHaveBeenCalledWith(email);

      // Verify AdminInitiateAuth was called correctly
      const initiateCalls = cognitoMock.commandCalls(AdminInitiateAuthCommand);
      expect(initiateCalls).toHaveLength(1);
      expect(initiateCalls[0].args[0].input).toMatchObject({
        UserPoolId: 'us-east-1_TEST123',
        ClientId: 'test-client-id',
        AuthFlow: 'CUSTOM_AUTH',
        AuthParameters: {
          USERNAME: email,
          SECRET_HASH: expect.any(String),
        },
      });

      // Verify AdminRespondToAuthChallenge was called correctly
      const challengeCalls = cognitoMock.commandCalls(
        AdminRespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(1);
      expect(challengeCalls[0].args[0].input).toMatchObject({
        UserPoolId: 'us-east-1_TEST123',
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

      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        // No Session field
      });

      await expect(
        service.initiate({ username: email, redirectUri })
      ).rejects.toThrow('Failed to send magic link. Please try again.');
    });

    it('should throw error if RespondToAuthChallenge fails without session', async () => {
      const email = 'test@example.com';
      const redirectUri = 'https://example.com/auth/magic-link';

      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        Session: 'initial-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      cognitoMock.on(AdminRespondToAuthChallengeCommand).resolves({
        // No Session field
      });

      await expect(
        service.initiate({ username: email, redirectUri })
      ).rejects.toThrow('Failed to send magic link. Please try again.');
    });

    it('should skip user creation when alreadyHaveMagicLink is true', async () => {
      const email = 'test@example.com';
      const redirectUri = 'https://example.com/auth/magic-link';

      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        Session: 'initial-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      const result = await service.initiate({
        username: email,
        redirectUri,
        alreadyHaveMagicLink: true,
      });

      expect(result).toEqual({
        session: 'initial-session-token',
        message: 'Please check your email for the magic link to continue.',
      });

      // Verify findOrCreateUser was NOT called when alreadyHaveMagicLink is true
      expect(mockUserService.findOrCreateUser).not.toHaveBeenCalled();

      // Verify AdminRespondToAuthChallenge was NOT called (early return)
      const challengeCalls = cognitoMock.commandCalls(
        AdminRespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(0);
    });

    it('should skip user creation when username is not an email', async () => {
      const username = 'not-an-email';
      const redirectUri = 'https://example.com/auth/magic-link';

      cognitoMock.on(AdminInitiateAuthCommand).resolves({
        Session: 'initial-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      cognitoMock.on(AdminRespondToAuthChallengeCommand).resolves({
        Session: 'challenge-session-token',
        ChallengeName: 'CUSTOM_CHALLENGE',
      });

      const result = await service.initiate({ username, redirectUri });

      expect(result).toEqual({
        session: 'challenge-session-token',
        message: 'Magic link sent to your email. Please check your inbox.',
      });

      // Verify findOrCreateUser was NOT called when username is not an email
      expect(mockUserService.findOrCreateUser).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('should complete magic link flow and return tokens', async () => {
      const session = 'challenge-session-token';
      // Create a valid secret (base64url encoded message + signature)
      const message = JSON.stringify({ userName: 'test@example.com' });
      const messageB64 = Buffer.from(message).toString('base64url');
      const secret = `${messageB64}.signature`;

      cognitoMock.on(AdminRespondToAuthChallengeCommand).resolves({
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

      // Verify UserService.findOrCreateUser was NOT called in complete
      // (user creation happens in initiate)
      expect(mockUserService.findOrCreateUser).not.toHaveBeenCalled();

      // Verify setEmailVerified was called after successful authentication
      expect(mockUserService.setEmailVerified).toHaveBeenCalledWith(
        'test@example.com'
      );

      // Verify AdminRespondToAuthChallenge was called correctly
      const challengeCalls = cognitoMock.commandCalls(
        AdminRespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(1);
      expect(challengeCalls[0].args[0].input).toMatchObject({
        UserPoolId: 'us-east-1_TEST123',
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

      cognitoMock.on(AdminRespondToAuthChallengeCommand).resolves({
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

      // Verify UserService.findOrCreateUser was NOT called in complete
      // (user creation happens in initiate)
      expect(mockUserService.findOrCreateUser).not.toHaveBeenCalled();

      // Verify setEmailVerified was called after successful authentication
      expect(mockUserService.setEmailVerified).toHaveBeenCalledWith(
        'test@example.com'
      );

      // Verify AdminRespondToAuthChallenge was called with redirectUri in metadata
      const challengeCalls = cognitoMock.commandCalls(
        AdminRespondToAuthChallengeCommand
      );
      expect(challengeCalls).toHaveLength(1);
      expect(challengeCalls[0].args[0].input).toMatchObject({
        UserPoolId: 'us-east-1_TEST123',
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

      cognitoMock.on(AdminRespondToAuthChallengeCommand).resolves({
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

      cognitoMock.on(AdminRespondToAuthChallengeCommand).rejects(error);

      await expect(service.complete({ session, secret })).rejects.toThrow(
        'Invalid or expired magic link. Please request a new one.'
      );
    });
  });
});
