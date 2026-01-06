import {
  CognitoIdentityProviderClient,
  GetTokensFromRefreshTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { getCognitoConfig } from '../utils/cognito-config.ts';

// ============================================================================
// Types
// ============================================================================

export interface TokenRefreshConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
}

export interface RefreshTokensInput {
  refreshToken: string;
}

export interface RefreshTokensOutput {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

// ============================================================================
// Service
// ============================================================================

export class TokenRefreshService {
  private cognito: CognitoIdentityProviderClient;
  private config: TokenRefreshConfig;

  constructor(config: TokenRefreshConfig) {
    this.config = config;
    this.cognito = new CognitoIdentityProviderClient({});
  }

  /**
   * Refresh authentication tokens using Cognito GetTokensFromRefreshToken API
   *
   * This uses the refresh token to obtain new access and ID tokens.
   * The refresh token itself is not rotated by this flow.
   */
  async refresh(input: RefreshTokensInput): Promise<RefreshTokensOutput> {
    const { refreshToken } = input;

    try {
      // Use GetTokensFromRefreshToken API
      const response = await this.cognito.send(
        new GetTokensFromRefreshTokenCommand({
          RefreshToken: refreshToken,
          ClientId: this.config.clientId,
          ClientSecret: this.config.clientSecret,
        })
      );

      if (
        !response.AuthenticationResult?.AccessToken ||
        !response.AuthenticationResult?.IdToken
      ) {
        throw new Error('Failed to refresh tokens');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        expiresIn: response.AuthenticationResult.ExpiresIn ?? 3600,
        tokenType: response.AuthenticationResult.TokenType ?? 'Bearer',
      };
    } catch (error) {
      console.error('Error refreshing tokens:', error);

      // Check for specific Cognito errors
      if (error instanceof Error) {
        if (error.name === 'NotAuthorizedException') {
          throw new Error('Refresh token is invalid or expired');
        }
        if (error.name === 'UserNotFoundException') {
          throw new Error('User not found');
        }
      }

      throw new Error('Failed to refresh tokens. Please log in again.');
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a TokenRefreshService instance from SST Config
 *
 * This fetches the complete Cognito configuration from SST Config:
 * - User pool ID and client ID from Config.Parameter (stable, cached in Lambda env)
 * - Client secret from Cognito API via getCognitoConfig (with 5-min cache)
 */
export async function createTokenRefreshService(): Promise<TokenRefreshService> {
  const config = await getCognitoConfig();
  return new TokenRefreshService(config);
}
