import {
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  CognitoIdentityProviderClient,
  type AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { calculateSecretHash } from '../utils/cognito.ts';
import { getCognitoConfig } from '../utils/cognito-config.ts';
import type { CognitoContextData } from '@contract/internal-api/auth';
import { UserService } from './user.ts';

// ============================================================================
// Types
// ============================================================================

export interface MagicLinkConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
}

export interface InitiateMagicLinkInput {
  username: string;
  redirectUri: string;
  contextData?: CognitoContextData;
  alreadyHaveMagicLink?: boolean;
}

export interface InitiateMagicLinkOutput {
  session: string;
  message: string;
}

export interface CompleteMagicLinkInput {
  session: string; // Required - main-ui handles cross-browser before calling
  secret: string;
  redirectUri?: string;
  contextData?: CognitoContextData;
}

export interface CompleteMagicLinkOutput {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// ============================================================================
// Service
// ============================================================================

export class MagicLinkService {
  private cognito: CognitoIdentityProviderClient;
  private config: MagicLinkConfig;
  private userService: UserService;

  constructor(config: MagicLinkConfig, userService: UserService) {
    this.config = config;
    this.cognito = new CognitoIdentityProviderClient({});
    this.userService = userService;
  }

  /**
   * Initiate magic link authentication flow
   *
   * This starts the Cognito custom auth flow and triggers the Lambda
   * to send a magic link email to the user.
   *
   * The user is created in both the database and Cognito before initiating
   * the auth flow, ensuring the user exists when the magic link is sent.
   */
  async initiate(
    input: InitiateMagicLinkInput
  ): Promise<InitiateMagicLinkOutput> {
    const { username, redirectUri, contextData } = input;

    try {
      // Only create user if this is a new magic link request (not a retry with existing link)
      // and username is an email address
      if (!input.alreadyHaveMagicLink && username.includes('@')) {
        await this.userService.findOrCreateUser(username);
      }

      // Calculate SECRET_HASH for client authentication
      const secretHash = calculateSecretHash(
        username,
        this.config.clientId,
        this.config.clientSecret
      );

      // Step 1: InitiateAuth with CUSTOM_AUTH
      const initiateResponse = await this.cognito.send(
        new AdminInitiateAuthCommand({
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          AuthFlow: 'CUSTOM_AUTH' as AuthFlowType,
          AuthParameters: {
            USERNAME: username,
            SECRET_HASH: secretHash,
          },
          ContextData: contextData,
        })
      );

      if (!initiateResponse.Session) {
        throw new Error('Failed to initiate authentication');
      }

      if (input.alreadyHaveMagicLink) {
        return {
          session: initiateResponse.Session,
          message: 'Please check your email for the magic link to continue.',
        };
      }

      // Step 2: Respond to PROVIDE_AUTH_PARAMETERS challenge
      const challengeResponse = await this.cognito.send(
        new AdminRespondToAuthChallengeCommand({
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          ChallengeName: 'CUSTOM_CHALLENGE',
          Session: initiateResponse.Session,
          ChallengeResponses: {
            USERNAME: username,
            ANSWER: '__dummy__',
            SECRET_HASH: secretHash,
          },
          ClientMetadata: {
            signInMethod: 'MAGIC_LINK',
            redirectUri,
            alreadyHaveMagicLink: 'no',
          },
          ContextData: contextData,
        })
      );

      if (!challengeResponse.Session) {
        throw new Error('Failed to create magic link challenge');
      }

      return {
        session: challengeResponse.Session,
        message: 'Magic link sent to your email. Please check your inbox.',
      };
    } catch (error) {
      console.error('Error initiating magic link:', error);

      throw new Error('Failed to send magic link. Please try again.');
    }
  }

  /**
   * Complete magic link authentication flow
   *
   * This verifies the magic link secret and completes the authentication,
   * returning JWT tokens if successful.
   *
   * NOTE: Session is required. For cross-browser scenarios, main-ui must first
   * call initiateMagicLink to obtain a fresh session before calling this method.
   */
  async complete(
    input: CompleteMagicLinkInput & { redirectUri?: string }
  ): Promise<CompleteMagicLinkOutput> {
    const { session, secret, redirectUri, contextData } = input;

    try {
      // Extract email from secret for SECRET_HASH calculation
      const [messageB64] = secret.split('.');
      const message = JSON.parse(
        Buffer.from(messageB64, 'base64url').toString()
      );
      const username = message.userName;

      // Calculate SECRET_HASH
      const secretHash = calculateSecretHash(
        username,
        this.config.clientId,
        this.config.clientSecret
      );

      // Respond to the magic link challenge with the provided session
      const response = await this.cognito.send(
        new AdminRespondToAuthChallengeCommand({
          UserPoolId: this.config.userPoolId,
          ClientId: this.config.clientId,
          ChallengeName: 'CUSTOM_CHALLENGE',
          Session: session,
          ChallengeResponses: {
            USERNAME: username,
            ANSWER: secret,
            SECRET_HASH: secretHash,
          },
          ClientMetadata: {
            signInMethod: 'MAGIC_LINK',
            ...(redirectUri && { redirectUri }),
            alreadyHaveMagicLink: 'yes',
          },
          ContextData: contextData,
        })
      );

      if (
        !response.AuthenticationResult?.AccessToken ||
        !response.AuthenticationResult?.IdToken ||
        !response.AuthenticationResult?.RefreshToken
      ) {
        throw new Error('Invalid magic link or session expired');
      }

      // Mark email as verified in DB after successful authentication
      await this.userService.setEmailVerified(username);

      return {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn ?? 3600,
        tokenType: response.AuthenticationResult.TokenType ?? 'Bearer',
      };
    } catch (error) {
      console.error('Error completing magic link:', error);
      throw new Error(
        'Invalid or expired magic link. Please request a new one.'
      );
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a MagicLinkService instance from SST Config
 *
 * This fetches the complete Cognito configuration from SST Config:
 * - User pool ID and client ID from Config.Parameter (stable, cached in Lambda env)
 * - Client secret from Cognito API via getCognitoConfig (with 5-min cache)
 */
export async function createMagicLinkService(): Promise<MagicLinkService> {
  const config = await getCognitoConfig();
  const userService = new UserService(config);
  return new MagicLinkService(config, userService);
}
