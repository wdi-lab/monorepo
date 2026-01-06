import { oc } from '@orpc/contract';
import * as z from 'zod';

const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
});

/**
 * Supported social login providers
 *
 * Each provider can be individually enabled/disabled in the infrastructure configuration.
 * - google: Google OAuth 2.0 (OpenID Connect)
 * - apple: Sign in with Apple (OpenID Connect)
 * - microsoft: Microsoft Identity Platform (OpenID Connect)
 */
export const SocialProviderSchema = z.enum([
  'google',
  'apple',
  'microsoft',
  'facebook',
]);
export type SocialProvider = z.infer<typeof SocialProviderSchema>;

/**
 * Contract for getting user info by ID
 */
export const getUser = oc
  .route({ method: 'GET', path: '/users/{id}' })
  .input(UserSchema.pick({ id: true }))
  .output(UserSchema);

/**
 * Contract for initiating magic link authentication
 * Triggers Cognito custom auth flow to send magic link email
 */
export const initiateMagicLink = oc
  .route({ method: 'POST', path: '/magic-link/initiate' })
  .input(
    z.object({
      email: z.email('Invalid email address'),
      redirectUri: z.url('Invalid redirect URI'),
    })
  )
  .output(
    z.object({
      session: z.string(),
      message: z.string(),
    })
  );

/**
 * Contract for completing magic link authentication
 * Verifies the magic link and returns JWT tokens
 *
 * NOTE: Session is required. For cross-browser scenarios, main-ui must first
 * call initiateMagicLink to obtain a fresh session before calling this endpoint.
 */
export const completeMagicLink = oc
  .route({ method: 'POST', path: '/magic-link/complete' })
  .input(
    z.object({
      session: z.string(), // Required - main-ui handles cross-browser fallback
      secret: z.string(),
    })
  )
  .output(
    z.object({
      accessToken: z.string(),
      idToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
      tokenType: z.string(),
    })
  );

/**
 * Contract for initiating social login authentication
 * Generates OAuth authorization URL for the specified provider
 */
export const initiateSocialLogin = oc
  .route({ method: 'POST', path: '/social/initiate' })
  .input(
    z.object({
      provider: SocialProviderSchema,
      redirectUri: z.url('Invalid redirect URI'),
      codeChallenge: z.string(), // PKCE code challenge (S256)
    })
  )
  .output(
    z.object({
      authUrl: z.string(), // Provider's authorization URL
      state: z.string(), // CSRF state token
    })
  );

/**
 * Contract for completing social login authentication
 * Exchanges authorization code for tokens and issues Cognito tokens
 */
export const completeSocialLogin = oc
  .route({ method: 'POST', path: '/social/complete' })
  .input(
    z.object({
      provider: SocialProviderSchema,
      code: z.string(), // Authorization code from OAuth callback
      state: z.string(), // For CSRF validation
      codeVerifier: z.string(), // PKCE code verifier
      redirectUri: z.url('Invalid redirect URI'), // Must match initiate
    })
  )
  .output(
    z.object({
      accessToken: z.string(),
      idToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
      tokenType: z.string(),
    })
  );

/**
 * Contract for refreshing authentication tokens
 * Uses Cognito REFRESH_TOKEN_AUTH flow to get new access/id tokens
 *
 * Note: The refresh token itself is not rotated by Cognito REFRESH_TOKEN_AUTH flow.
 * Only access and id tokens are renewed.
 */
export const refreshTokens = oc
  .route({ method: 'POST', path: '/tokens/refresh' })
  .input(
    z.object({
      refreshToken: z.string(),
    })
  )
  .output(
    z.object({
      accessToken: z.string(),
      idToken: z.string(),
      expiresIn: z.number(),
      tokenType: z.string(),
    })
  );

/**
 * Internal API contract router
 */
export const contract = {
  user: {
    get: getUser,
  },
  magicLink: {
    initiate: initiateMagicLink,
    complete: completeMagicLink,
  },
  socialLogin: {
    initiate: initiateSocialLogin,
    complete: completeSocialLogin,
  },
  tokens: {
    refresh: refreshTokens,
  },
};

export type Contract = typeof contract;
