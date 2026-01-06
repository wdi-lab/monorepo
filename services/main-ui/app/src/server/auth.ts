/**
 * Server-side authentication functions for magic link and social login flows
 *
 * These functions run on the server and call the auth service internal API
 * using IAM-signed requests.
 */

import { createServerFn } from '@tanstack/react-start';
import { useSession } from '@tanstack/react-start/server';
import * as client from 'openid-client';
import type { SocialProvider } from '@contract/internal-api/auth';
import { authClient } from '~/internal-api/auth';

// Session configuration for magic link flow
const sessionConfig = {
  password:
    process.env.SESSION_SECRET ||
    'change-me-in-production-to-a-secure-random-string-at-least-32-chars-long',
};

type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  /** Unix timestamp (ms) when tokens expire. Used for client-side expiry checking. */
  expiresAt: number;
};

type SocialLoginSession = {
  state: string;
  codeVerifier: string;
  provider: SocialProvider;
  redirectUri: string;
};

type SessionData = {
  cognitoSession?: string;
  redirectPath?: string;
  authTokens?: AuthTokens;
  socialLogin?: SocialLoginSession;
};

/**
 * Server function to initiate magic link authentication
 *
 * Stores session data in encrypted session cookie.
 */
export const initiateMagicLink = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { email: string; redirectUri: string; redirectPath?: string }) =>
      data
  )
  .handler(async ({ data }) => {
    try {
      const response = await authClient.magicLink.initiate({
        email: data.email,
        redirectUri: data.redirectUri,
      });

      // Store session data in encrypted session cookie
      const session = await useSession<SessionData>(sessionConfig);
      await session.update({
        cognitoSession: response.session,
        redirectPath: data.redirectPath || '/',
      });

      return {
        success: true,
        message: response.message,
      };
    } catch (error) {
      console.error('Error initiating magic link:', JSON.stringify(error));
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to send magic link. Please try again.',
      };
    }
  });

/**
 * Server function to get the redirect path from session
 *
 * Used by callback route to determine where to redirect after authentication.
 */
export const getRedirectPath = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useSession<SessionData>(sessionConfig);
    return session.data.redirectPath || '/';
  }
);

// ============================================================================
// ID Token Decoding
// ============================================================================

/**
 * Decoded ID token payload from Cognito
 * Contains user information from the identity provider
 */
type IdTokenPayload = {
  /** Subject - unique user identifier */
  sub: string;
  /** User's email address */
  email?: string;
  /** Whether email is verified */
  email_verified?: boolean;
  /** User's full name */
  name?: string;
  /** User's given/first name */
  given_name?: string;
  /** User's family/last name */
  family_name?: string;
  /** URL to user's profile picture */
  picture?: string;
  /** Token issuer */
  iss?: string;
  /** Audience (client ID) */
  aud?: string;
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
  /** Authentication time */
  auth_time?: number;
  /** Cognito username */
  'cognito:username'?: string;
};

/**
 * User information extracted from ID token
 */
export type User = {
  /** Unique user identifier (sub claim) */
  id: string;
  /** User's email address */
  email: string | null;
  /** User's display name */
  name: string | null;
  /** URL to user's profile picture */
  picture: string | null;
};

/**
 * Decode a JWT token payload without verification
 * Only use on server-side where tokens are already trusted
 */
function decodeJwtPayload<T>(token: string): T | null {
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;

    const payload = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

/**
 * Extract user information from ID token payload
 */
function extractUserFromIdToken(payload: IdTokenPayload): User {
  return {
    id: payload.sub,
    email: payload.email ?? null,
    name: payload.name ?? payload.given_name ?? null,
    picture: payload.picture ?? null,
  };
}

/**
 * Server function to process magic link callback
 *
 * Handles the entire magic link completion flow:
 * 1. Parses the hash to extract email (for cross-browser fallback)
 * 2. Attempts completion with session from HttpOnly cookie
 * 3. Handles cross-browser case by re-initiating auth if no session
 * 4. Stores tokens in session on success
 *
 * @param hash - The URL hash fragment (without #) containing the magic link secret
 * @param redirectUri - The redirect URI for cross-browser fallback (e.g., https://example.com/auth/magic-link)
 */
export const processMagicLink = createServerFn({ method: 'POST' })
  .inputValidator((data: { hash: string; redirectUri: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Validate hash exists
      if (!data.hash) {
        return {
          success: false as const,
          error: 'No magic link data found in URL',
        };
      }

      // Parse hash to extract email (for cross-browser fallback)
      let email: string;
      try {
        const [messageB64] = data.hash.split('.');
        const message = JSON.parse(
          Buffer.from(messageB64, 'base64url').toString()
        );
        email = message.userName;
      } catch {
        return { success: false as const, error: 'Invalid magic link format' };
      }

      // Get session
      const session = await useSession<SessionData>(sessionConfig);
      let cognitoSession = session.data.cognitoSession;

      // Handle cross-browser case (no session cookie exists)
      if (!cognitoSession) {
        try {
          const initiateResponse = await authClient.magicLink.initiate({
            email,
            redirectUri: data.redirectUri,
          });
          cognitoSession = initiateResponse.session;
        } catch {
          return {
            success: false as const,
            error: 'Failed to initiate authentication session',
          };
        }
      }

      // Complete magic link authentication
      const response = await authClient.magicLink.complete({
        session: cognitoSession,
        secret: data.hash,
      });

      // Store tokens in session & clear auth session data
      const redirectPath = session.data.redirectPath || '/';
      await session.update({
        cognitoSession: undefined,
        redirectPath: undefined,
        authTokens: {
          accessToken: response.accessToken,
          idToken: response.idToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
          tokenType: response.tokenType,
          expiresAt: Date.now() + response.expiresIn * 1000,
        },
      });

      return { success: true as const, redirectPath };
    } catch (error) {
      console.error('Error processing magic link:', error);
      return {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : 'Invalid or expired magic link. Please request a new one.',
      };
    }
  });

/**
 * Server function to get current authentication status
 *
 * Returns authentication state with:
 * - isAuthenticated: true if access token exists and is not expired
 * - canRefresh: true if refresh token exists (can attempt to renew session)
 * - expiresAt: Unix timestamp (ms) when access token expires
 * - user: User information decoded from ID token (when authenticated)
 *
 * Auth state scenarios:
 * - isAuthenticated=true, canRefresh=true: Active session with user info
 * - isAuthenticated=false, canRefresh=true: Session expired, can refresh
 * - isAuthenticated=false, canRefresh=false: No session, must login
 */
export const getAuthStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useSession<SessionData>(sessionConfig);
    const authTokens = session.data.authTokens;

    // No tokens at all - not authenticated and can't refresh
    if (!authTokens) {
      return {
        isAuthenticated: false as const,
        canRefresh: false as const,
        expiresAt: null,
        user: null,
      };
    }

    const isExpired = Date.now() >= authTokens.expiresAt;
    const canRefresh = !!authTokens.refreshToken;

    // Decode ID token to get user information
    let user: User | null = null;
    if (authTokens.idToken) {
      const payload = decodeJwtPayload<IdTokenPayload>(authTokens.idToken);
      if (payload) {
        user = extractUserFromIdToken(payload);
      }
    }

    return {
      isAuthenticated: !isExpired,
      canRefresh,
      expiresAt: authTokens.expiresAt,
      user,
    };
  }
);

// ============================================================================
// Social Login Server Functions
// ============================================================================

/**
 * Server function to initiate social login authentication
 *
 * Generates PKCE code verifier/challenge, calls auth service to get OAuth URL,
 * and stores PKCE state in session cookie.
 *
 * @param provider - The social provider to use (e.g., 'google')
 * @param redirectUri - The redirect URI for OAuth callback (where provider redirects back to)
 * @param redirectPath - Path to redirect to after successful login
 * @returns authUrl to redirect the user to, or error
 */
export const initiateSocialLogin = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      provider: SocialProvider;
      redirectUri: string;
      redirectPath?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge =
        await client.calculatePKCECodeChallenge(codeVerifier);

      // Call auth service to get OAuth authorization URL
      const response = await authClient.socialLogin.initiate({
        provider: data.provider,
        redirectUri: data.redirectUri,
        codeChallenge,
      });

      // Store PKCE state and redirectUri in session cookie
      const session = await useSession<SessionData>(sessionConfig);
      await session.update({
        ...session.data,
        socialLogin: {
          state: response.state,
          codeVerifier,
          provider: data.provider,
          redirectUri: data.redirectUri,
        },
        redirectPath: data.redirectPath || '/',
      });

      return {
        success: true as const,
        authUrl: response.authUrl,
      };
    } catch (error) {
      console.error('Error initiating social login:', error);
      return {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to initiate social login. Please try again.',
      };
    }
  });

/**
 * Server function to process social login callback
 *
 * Verifies state, exchanges authorization code for tokens via auth service,
 * and stores tokens in session.
 *
 * @param code - Authorization code from OAuth callback
 * @param state - State parameter from OAuth callback (for CSRF validation)
 * @returns Success with redirect path, or error
 */
export const processSocialCallback = createServerFn({ method: 'POST' })
  .inputValidator((data: { code: string; state: string }) => data)
  .handler(async ({ data }) => {
    try {
      // Get session with stored PKCE state
      const session = await useSession<SessionData>(sessionConfig);
      const { socialLogin, redirectPath } = session.data;

      // Validate state (CSRF protection)
      if (!socialLogin?.state || socialLogin.state !== data.state) {
        return {
          success: false as const,
          error: 'Invalid state parameter. Please try logging in again.',
        };
      }

      // Call auth service to complete social login
      const response = await authClient.socialLogin.complete({
        provider: socialLogin.provider,
        code: data.code,
        state: data.state,
        codeVerifier: socialLogin.codeVerifier,
        redirectUri: socialLogin.redirectUri,
      });

      // Store tokens and clear social login session data
      await session.update({
        cognitoSession: undefined,
        redirectPath: undefined,
        socialLogin: undefined,
        authTokens: {
          accessToken: response.accessToken,
          idToken: response.idToken,
          refreshToken: response.refreshToken,
          expiresIn: response.expiresIn,
          tokenType: response.tokenType,
          expiresAt: Date.now() + response.expiresIn * 1000,
        },
      });

      return { success: true as const, redirectPath: redirectPath || '/' };
    } catch (error) {
      console.error('Error processing social callback:', error);
      return {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to complete social login. Please try again.',
      };
    }
  });

/**
 * Server function to refresh authentication tokens
 *
 * Calls the auth service to get new access/id tokens using the refresh token.
 * Updates the session with new tokens and expiration time.
 *
 * @returns Success with new expiration time, or error
 */
export const refreshTokens = createServerFn({ method: 'POST' }).handler(
  async () => {
    try {
      const session = await useSession<SessionData>(sessionConfig);
      const authTokens = session.data.authTokens;

      if (!authTokens?.refreshToken) {
        return {
          success: false as const,
          error: 'No refresh token available',
        };
      }

      // Call auth service to refresh tokens
      const response = await authClient.tokens.refresh({
        refreshToken: authTokens.refreshToken,
      });

      // Update session with new tokens
      // Note: refreshToken is not rotated by Cognito REFRESH_TOKEN_AUTH flow
      const newExpiresAt = Date.now() + response.expiresIn * 1000;
      await session.update({
        ...session.data,
        authTokens: {
          ...authTokens,
          accessToken: response.accessToken,
          idToken: response.idToken,
          expiresIn: response.expiresIn,
          tokenType: response.tokenType,
          expiresAt: newExpiresAt,
        },
      });

      // Decode new ID token to get updated user info
      let user: User | null = null;
      if (response.idToken) {
        const payload = decodeJwtPayload<IdTokenPayload>(response.idToken);
        if (payload) {
          user = extractUserFromIdToken(payload);
        }
      }

      return {
        success: true as const,
        expiresAt: newExpiresAt,
        user,
      };
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to refresh tokens. Please log in again.',
      };
    }
  }
);

/**
 * Server function to log out the user
 *
 * Clears all authentication data from the session.
 */
export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);
  await session.update({
    cognitoSession: undefined,
    redirectPath: undefined,
    authTokens: undefined,
    socialLogin: undefined,
  });

  return { success: true };
});
