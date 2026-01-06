/**
 * Auth Status Query - Cached auth status fetching with automatic token refresh
 *
 * Uses TanStack Query to cache auth status and automatically refresh tokens
 * before they expire using refetchInterval.
 *
 * Usage in beforeLoad:
 *   const auth = await fetchAuthStatus(context.queryClient);
 *
 * The query is cached with staleTime: Infinity on the client, meaning it won't
 * refetch automatically except via the refetchInterval for token refresh.
 * To refresh auth status (e.g., after login/logout), use:
 *   - useQueryClient() hook in components
 *   - queryClient.removeQueries({ queryKey: AUTH_STATUS_QUERY_KEY })
 *
 * On the server (SSR), we always fetch fresh data because we now create
 * a fresh QueryClient per request, eliminating the cache isolation issue.
 */

import type { QueryClient } from '@tanstack/react-query';
import type { AuthStatus } from '~/providers/AuthProvider';
import { getAuthStatus, refreshTokens } from '~/server/auth';

export const AUTH_STATUS_QUERY_KEY = ['auth', 'status'] as const;

// ============================================================================
// Constants for token refresh timing
// ============================================================================

const DEFAULT_REFRESH_BEFORE_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const JITTER_PERCENTAGE = 0.1; // ±10% jitter to prevent thundering herd
const MIN_INTERVAL_MS = 1000; // Minimum 1 second interval

// ============================================================================
// Refetch Interval Calculation
// ============================================================================

/**
 * Calculate the refetch interval for automatic token refresh
 *
 * Returns the time (ms) until the next token refresh should occur,
 * with jitter applied to prevent thundering herd when multiple
 * tabs/users have similar expiry times.
 *
 * @param data - Current auth status from query cache
 * @returns Interval in ms, or false to disable refetching
 */
export function calculateRefetchInterval(
  data: AuthStatus | undefined
): number | false {
  // Don't refetch if no data or can't refresh
  if (!data?.expiresAt || !data.canRefresh) {
    return false;
  }

  // Don't refetch if not authenticated (let user manually refresh via dialog)
  if (!data.isAuthenticated) {
    return false;
  }

  const msUntilExpiry = data.expiresAt - Date.now();
  const baseInterval = Math.max(msUntilExpiry - DEFAULT_REFRESH_BEFORE_MS, 0);

  // Add jitter: ±10% randomization
  const jitter = baseInterval * JITTER_PERCENTAGE * (Math.random() * 2 - 1);
  const interval = Math.max(baseInterval + jitter, MIN_INTERVAL_MS);

  return interval;
}

// ============================================================================
// Query Function for Auth Status with Token Refresh
// ============================================================================

/**
 * Query function that handles both initial auth status fetch and token refresh
 *
 * When called by refetchInterval (tokens about to expire):
 * - If authenticated and can refresh, calls refreshTokens() to get new tokens
 * - Returns updated auth status with new expiresAt
 *
 * When tokens have expired:
 * - Returns current status (isAuthenticated: false)
 * - Does not auto-refresh - lets SessionExpiredDialog handle it
 */
export async function authStatusQueryFn(): Promise<AuthStatus> {
  const currentStatus = await getAuthStatus();

  // If authenticated and have refresh capability, this is a normal refetch
  // The refetchInterval only triggers when authenticated, so if we get here
  // during a refetch, we should refresh the tokens
  if (currentStatus.isAuthenticated && currentStatus.canRefresh) {
    // Check if we're within the refresh window
    const msUntilExpiry = currentStatus.expiresAt
      ? currentStatus.expiresAt - Date.now()
      : 0;

    if (msUntilExpiry <= DEFAULT_REFRESH_BEFORE_MS) {
      // Within refresh window, try to refresh
      const refreshResult = await refreshTokens();
      if (refreshResult.success) {
        return {
          isAuthenticated: true,
          canRefresh: true,
          expiresAt: refreshResult.expiresAt,
          user: refreshResult.user,
        };
      }
      // Refresh failed - return failed state
      return {
        isAuthenticated: false,
        canRefresh: false,
        expiresAt: null,
        user: null,
      };
    }
  }

  return currentStatus;
}

/**
 * Check if we're running on the server (SSR)
 */
const isServer = typeof window === 'undefined';

/**
 * Fetch auth status with caching
 *
 * On the client:
 * - Returns cached data if available
 * - Fetches fresh data if cache is empty
 * - Uses staleTime: Infinity so it only fetches once per session
 *
 * On the server:
 * - Always fetches fresh data
 * - Now safe to cache because each request has its own QueryClient
 *
 * @param queryClient - The QueryClient from router context
 */
export async function fetchAuthStatus(
  queryClient: QueryClient
): Promise<AuthStatus> {
  if (isServer) {
    // On server, always fetch fresh data
    // This is now safe because each request has its own QueryClient
    return getAuthStatus();
  }

  // On client, use caching to avoid redundant calls during navigation
  // Note: We use getAuthStatus here (not authStatusQueryFn) because
  // fetchAuthStatus is for initial load, not for refresh
  return queryClient.fetchQuery({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: getAuthStatus,
    // Never consider the data stale - only refetch when explicitly invalidated
    staleTime: Infinity,
  });
}

/**
 * Invalidate auth status cache using the provided QueryClient
 *
 * Call this after login/logout to force a fresh fetch on next access.
 * Uses removeQueries instead of invalidateQueries to prevent a background
 * refetch that would cause UI flicker before the page redirect completes.
 *
 * @param queryClient - The QueryClient from useQueryClient() hook
 */
export function invalidateAuthStatus(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: AUTH_STATUS_QUERY_KEY });
}

/**
 * Update auth status in cache directly
 *
 * Use this after successful login to update the cache without refetching.
 *
 * @param queryClient - The QueryClient from useQueryClient() hook
 * @param status - The new auth status to set in cache
 */
export function setAuthStatus(
  queryClient: QueryClient,
  status: AuthStatus
): void {
  queryClient.setQueryData(AUTH_STATUS_QUERY_KEY, status);
}
