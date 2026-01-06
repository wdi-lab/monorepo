import { os } from '@orpc/server';
import type { TokenRefreshService } from '../services/token-refresh.ts';
import { createTokenRefreshService } from '../services/token-refresh.ts';

/**
 * Context extension for token refresh routes
 */
export interface TokenRefreshContext {
  tokenRefreshService: TokenRefreshService;
}

/**
 * Module-level cache for TokenRefreshService instance
 *
 * This caches the service across requests within the same Lambda execution context.
 * The service is created once per Lambda warm start, avoiding redundant Cognito API calls.
 */
let cachedTokenRefreshService: TokenRefreshService | null = null;

/**
 * Middleware that provides TokenRefreshService in the context
 *
 * This middleware instantiates the TokenRefreshService and adds it
 * to the ORPC context, making it available to all token refresh handlers.
 *
 * The service instance is cached at the module level, so it's created once
 * per Lambda execution context and reused across multiple requests.
 *
 * Usage:
 * ```ts
 * const refresh = implement(contract.tokens.refresh)
 *   .use(withTokenRefreshService)
 *   .handler(async ({ input, context }) => {
 *     return context.tokenRefreshService.refresh(input);
 *   });
 * ```
 */
export const withTokenRefreshService = os.middleware(async ({ next }) => {
  // Create service if not already cached
  if (!cachedTokenRefreshService) {
    cachedTokenRefreshService = await createTokenRefreshService();
  }

  return next({
    context: {
      tokenRefreshService: cachedTokenRefreshService,
    },
  });
});
