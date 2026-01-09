/**
 * Social Login Service
 *
 * Handles OAuth authentication with social providers using openid-client.
 * Supports multiple providers (Google, Apple, Microsoft) with per-provider enable/disable.
 * After successful OAuth, it creates/finds a Cognito user and issues Cognito tokens.
 *
 * Provider configuration is managed via SST Config (SSM Parameter Store).
 * See shared/social-providers.ts for the centralized provider configuration.
 */

import * as client from 'openid-client';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  type ContextDataType,
} from '@aws-sdk/client-cognito-identity-provider';
import { calculateSecretHash } from '../utils/cognito.ts';
import {
  getCognitoConfig,
  type CognitoConfig,
} from '../utils/cognito-config.ts';
import {
  type SocialProvider,
  type ProviderRuntimeConfig,
  getEnabledProviders,
} from '../../shared/social-providers.ts';
import type { CognitoContextData } from '@contract/internal-api/auth';
import { UserService } from './user.ts';

// ============================================================================
// Types
// ============================================================================

// Re-export SocialProvider for consumers
export type { SocialProvider };

export interface InitiateSocialLoginInput {
  provider: SocialProvider;
  redirectUri: string;
  codeChallenge: string;
  contextData?: CognitoContextData;
}

export interface InitiateSocialLoginOutput {
  authUrl: string;
  state: string;
}

export interface CompleteSocialLoginInput {
  provider: SocialProvider;
  code: string;
  state: string;
  codeVerifier: string;
  redirectUri: string;
  contextData?: CognitoContextData;
}

export interface CompleteSocialLoginOutput {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// ============================================================================
// Service
// ============================================================================

export class SocialLoginService {
  private cognito: CognitoIdentityProviderClient;
  private cognitoConfig: CognitoConfig;
  private providers: Map<SocialProvider, ProviderRuntimeConfig>;
  private clientConfigs: Map<SocialProvider, client.Configuration> = new Map();
  private userService: UserService;

  constructor(
    cognitoConfig: CognitoConfig,
    providers: Map<SocialProvider, ProviderRuntimeConfig>,
    userService: UserService
  ) {
    this.cognitoConfig = cognitoConfig;
    this.providers = providers;
    this.cognito = new CognitoIdentityProviderClient({});
    this.userService = userService;
  }

  /**
   * Get list of enabled providers
   */
  getEnabledProviders(): SocialProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a specific provider is enabled
   */
  isProviderEnabled(provider: SocialProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get or initialize OpenID client configuration for a provider
   */
  private async getClientConfig(
    provider: SocialProvider
  ): Promise<client.Configuration> {
    const cached = this.clientConfigs.get(provider);
    if (cached) {
      return cached;
    }

    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Provider ${provider} is not enabled`);
    }

    const clientConfig = await client.discovery(
      new URL(providerConfig.issuer),
      providerConfig.clientId,
      providerConfig.clientSecret
    );

    this.clientConfigs.set(provider, clientConfig);
    return clientConfig;
  }

  /**
   * Generate authorization URL for OAuth provider
   */
  async initiate(
    input: InitiateSocialLoginInput
  ): Promise<InitiateSocialLoginOutput> {
    const providerConfig = this.providers.get(input.provider);

    if (!providerConfig) {
      throw new Error(`Provider ${input.provider} is not enabled`);
    }

    const config = await this.getClientConfig(input.provider);

    // Generate CSRF state
    const state = client.randomState();

    // Build authorization URL with PKCE
    const authUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: input.redirectUri,
      scope: providerConfig.scope,
      state,
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
    });

    return { authUrl: authUrl.href, state };
  }

  /**
   * Exchange authorization code for tokens and issue Cognito tokens
   */
  async complete(
    input: CompleteSocialLoginInput
  ): Promise<CompleteSocialLoginOutput> {
    const providerConfig = this.providers.get(input.provider);

    if (!providerConfig) {
      throw new Error(`Provider ${input.provider} is not enabled`);
    }

    const config = await this.getClientConfig(input.provider);

    // Build the current URL with the authorization code
    const currentUrl = new URL(input.redirectUri);
    currentUrl.searchParams.set('code', input.code);
    currentUrl.searchParams.set('state', input.state);

    // Exchange code for tokens (with PKCE verification)
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: input.codeVerifier,
      expectedState: input.state,
    });

    // Get the raw ID token (JWT string) for Cognito verification
    const socialIdToken = tokens.id_token;
    if (!socialIdToken) {
      throw new Error(`No ID token returned from ${input.provider}`);
    }

    // Get user info from ID token claims
    const claims = tokens.claims();
    if (!claims) {
      throw new Error('No claims in token response');
    }

    const email = claims.email as string | undefined;
    const providerSub = claims.sub as string | undefined;

    if (!email) {
      throw new Error(`Missing email claim from ${input.provider} ID token`);
    }

    if (!providerSub) {
      throw new Error(`Missing sub claim from ${input.provider} ID token`);
    }

    // Extract additional user info from claims
    const givenName = claims.given_name as string | undefined;
    const familyName = claims.family_name as string | undefined;

    // Find or create user in DB and Cognito, then issue tokens
    // email is treated as the username for lookup
    await this.userService.findOrCreateUser(email, {
      firstName: givenName,
      lastName: familyName,
    });

    const cognitoTokens = await this.issueCognitoTokens(
      email,
      socialIdToken,
      input.provider,
      input.contextData
    );

    // Mark email as verified in DB after successful authentication
    await this.userService.setEmailVerified(email);

    return cognitoTokens;
  }

  /**
   * Issue Cognito tokens using AdminInitiateAuth with CUSTOM_AUTH flow
   */
  private async issueCognitoTokens(
    username: string,
    socialIdToken: string,
    provider: SocialProvider,
    contextData?: ContextDataType
  ): Promise<CompleteSocialLoginOutput> {
    const secretHash = calculateSecretHash(
      username,
      this.cognitoConfig.clientId,
      this.cognitoConfig.clientSecret
    );

    // Step 1: InitiateAuth with CUSTOM_AUTH
    const initiateResponse = await this.cognito.send(
      new AdminInitiateAuthCommand({
        UserPoolId: this.cognitoConfig.userPoolId,
        ClientId: this.cognitoConfig.clientId,
        AuthFlow: 'CUSTOM_AUTH',
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

    // Step 2: RespondToAuthChallenge with SOCIAL_LOGIN and ID token
    const challengeResponse = await this.cognito.send(
      new AdminRespondToAuthChallengeCommand({
        UserPoolId: this.cognitoConfig.userPoolId,
        ClientId: this.cognitoConfig.clientId,
        ChallengeName: 'CUSTOM_CHALLENGE',
        Session: initiateResponse.Session,
        ChallengeResponses: {
          USERNAME: username,
          ANSWER: socialIdToken,
          SECRET_HASH: secretHash,
        },
        ClientMetadata: {
          signInMethod: 'SOCIAL_LOGIN',
          socialProvider: provider,
        },
        ContextData: contextData,
      })
    );

    const result = challengeResponse.AuthenticationResult;
    if (!result?.AccessToken || !result?.IdToken || !result?.RefreshToken) {
      throw new Error('Failed to issue Cognito tokens');
    }

    return {
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      expiresIn: result.ExpiresIn ?? 3600,
      tokenType: result.TokenType ?? 'Bearer',
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a SocialLoginService instance from SST Config and Cognito configuration
 *
 * @throws Error if no providers are enabled
 */
export async function createSocialLoginService(): Promise<SocialLoginService> {
  const cognitoConfig = await getCognitoConfig();
  const providers = getEnabledProviders();

  if (providers.size === 0) {
    throw new Error(
      'No social login providers are enabled. ' +
        'Set SOCIAL_<PROVIDER>_CLIENT_ID to a valid value (not "NA") for at least one provider.'
    );
  }

  const userService = new UserService(cognitoConfig);
  return new SocialLoginService(cognitoConfig, providers, userService);
}
