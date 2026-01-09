import { implement } from '@orpc/server';
import { contract } from '@contract/internal-api/auth';
import { withMagicLinkService } from './middleware/magic-link.ts';
import { withSocialLoginService } from './middleware/social-login.ts';
import { withTokenRefreshService } from './middleware/token-refresh.ts';
import {
  userRepository,
  UserNotFoundError,
} from '../db/main/user-repository.ts';

// ============================================================================
// Procedures
// ============================================================================

/**
 * Implement the auth contract's getUser procedure
 *
 * Retrieves user data from DynamoDB using ElectroDB.
 * Throws a 404-equivalent error if user is not found.
 */
const getUser = implement(contract.user.get).handler(async ({ input }) => {
  const user = await userRepository.getById(input.id);

  if (!user) {
    throw new UserNotFoundError(input.id);
  }

  return {
    id: user.id,
    email: user.email,
  };
});

/**
 * Initiate magic link authentication flow
 *
 * Uses withMagicLinkService middleware to inject MagicLinkService into context
 */
const initiateMagicLink = implement(contract.magicLink.initiate)
  .use(withMagicLinkService)
  .handler(async ({ input, context }) => {
    return context.magicLinkService.initiate(input);
  });

/**
 * Complete magic link authentication flow
 *
 * Uses withMagicLinkService middleware to inject MagicLinkService into context
 */
const completeMagicLink = implement(contract.magicLink.complete)
  .use(withMagicLinkService)
  .handler(async ({ input, context }) => {
    return context.magicLinkService.complete(input);
  });

/**
 * Initiate social login authentication flow
 *
 * Generates OAuth authorization URL for the specified provider (Google).
 * Uses withSocialLoginService middleware to inject SocialLoginService into context.
 */
const initiateSocialLogin = implement(contract.socialLogin.initiate)
  .use(withSocialLoginService)
  .handler(async ({ input, context }) => {
    return context.socialLoginService.initiate(input);
  });

/**
 * Complete social login authentication flow
 *
 * Exchanges authorization code for tokens and issues Cognito tokens.
 * Uses withSocialLoginService middleware to inject SocialLoginService into context.
 */
const completeSocialLogin = implement(contract.socialLogin.complete)
  .use(withSocialLoginService)
  .handler(async ({ input, context }) => {
    return context.socialLoginService.complete(input);
  });

/**
 * Refresh authentication tokens
 *
 * Uses Cognito REFRESH_TOKEN_AUTH flow to obtain new access and ID tokens.
 * Uses withTokenRefreshService middleware to inject TokenRefreshService into context.
 */
const refreshTokens = implement(contract.tokens.refresh)
  .use(withTokenRefreshService)
  .handler(async ({ input, context }) => {
    return context.tokenRefreshService.refresh(input);
  });

/**
 * Auth service internal API router implementing the contract
 */
export const router = {
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

export type Router = typeof router;
