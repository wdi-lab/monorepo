/**
 * AuthProvider - Shared authentication state context
 *
 * Provides authentication state throughout the app using TanStack Query
 * as the single source of truth:
 * - User information (id, email, name, picture)
 * - Authentication status (isAuthenticated, canRefresh)
 * - Token expiration tracking
 * - Automatic token refresh via refetchInterval
 *
 * The provider uses useQuery with refetchInterval to automatically refresh
 * tokens before they expire. All auth state is derived from the query cache.
 *
 * Usage:
 * 1. Wrap your app with <AuthProvider initialStatus={...}>
 * 2. Use useAuth() hook to access auth state
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import type { User } from '~/server/auth';
import { refreshTokens } from '~/server/auth';
import {
  AUTH_STATUS_QUERY_KEY,
  authStatusQueryFn,
  calculateRefetchInterval,
  invalidateAuthStatus,
  setAuthStatus,
} from '~/queries/auth/authStatus';

// ============================================================================
// Types
// ============================================================================

export type SessionState = 'active' | 'expired' | 'login';

export interface AuthStatus {
  isAuthenticated: boolean;
  canRefresh: boolean;
  expiresAt: number | null;
  user: User | null;
}

export interface AuthContextValue {
  /** Current user information */
  user: User | null;
  /** Whether the user is authenticated (has valid access token) */
  isAuthenticated: boolean;
  /** Whether the session can be refreshed (has refresh token) */
  canRefresh: boolean;
  /** Unix timestamp (ms) when access token expires */
  expiresAt: number | null;
  /** Current session state for UI decisions */
  sessionState: SessionState;
  /** Whether a token refresh is in progress */
  isRefreshing: boolean;
  /** Manually trigger a token refresh */
  refresh: () => Promise<boolean>;
  /** Update auth state after successful login */
  onLoginSuccess: (status: AuthStatus) => void;
  /** Clear auth state after logout */
  onLogout: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_REFRESH_BEFORE_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface AuthProviderProps {
  children: ReactNode;
  /** Initial auth status from server (via beforeLoad) */
  initialStatus: AuthStatus;
}

export function AuthProvider({ children, initialStatus }: AuthProviderProps) {
  // Get queryClient from the QueryClientProvider context
  const queryClient = useQueryClient();

  // Track if we're manually refreshing (vs automatic refetchInterval)
  const isManualRefreshRef = useRef(false);

  // ============================================================================
  // TanStack Query - Single Source of Truth
  // ============================================================================

  const {
    data: authStatus,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: AUTH_STATUS_QUERY_KEY,
    queryFn: authStatusQueryFn,
    // Never consider data stale - we control refresh via refetchInterval
    staleTime: Infinity,
    // Initial data from server (SSR)
    initialData: initialStatus,
    // Dynamic refresh interval with jitter
    refetchInterval: (query) => calculateRefetchInterval(query.state.data),
    // Pause refresh when tab is in background
    refetchIntervalInBackground: false,
    // Don't auto-refetch on window focus - we handle this manually
    // to show SessionExpiredDialog when tokens expired while hidden
    refetchOnWindowFocus: false,
    // Don't refetch on mount - we have initialData from SSR
    refetchOnMount: false,
  });

  // ============================================================================
  // Derived State from Query Cache
  // ============================================================================

  const isAuthenticated = authStatus.isAuthenticated;
  const canRefresh = authStatus.canRefresh;
  const expiresAt = authStatus.expiresAt;
  const user = authStatus.user;

  // isRefreshing: true when fetching AND either manually refreshing or already authenticated
  // (to distinguish from initial load)
  const isRefreshing =
    isFetching && (isManualRefreshRef.current || isAuthenticated);

  // Derive session state from auth status
  const sessionState: SessionState = useMemo(() => {
    if (isAuthenticated) return 'active';
    if (canRefresh) return 'expired';
    return 'login';
  }, [isAuthenticated, canRefresh]);

  // ============================================================================
  // Auth Actions
  // ============================================================================

  /**
   * Manually trigger a token refresh
   *
   * Used by SessionExpiredDialog when user clicks "Try Again"
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    isManualRefreshRef.current = true;
    try {
      const result = await refreshTokens();
      if (result.success) {
        const newStatus: AuthStatus = {
          isAuthenticated: true,
          canRefresh: true,
          expiresAt: result.expiresAt,
          user: result.user,
        };
        setAuthStatus(queryClient, newStatus);
        return true;
      } else {
        console.error('Token refresh failed:', result.error);
        // Update cache to reflect failed state
        setAuthStatus(queryClient, {
          isAuthenticated: false,
          canRefresh: false,
          expiresAt: null,
          user: null,
        });
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      setAuthStatus(queryClient, {
        isAuthenticated: false,
        canRefresh: false,
        expiresAt: null,
        user: null,
      });
      return false;
    } finally {
      isManualRefreshRef.current = false;
    }
  }, [queryClient]);

  /**
   * Update auth state after successful login
   *
   * Updates the query cache directly - no need for callers to also call setAuthStatus
   */
  const onLoginSuccess = useCallback(
    (status: AuthStatus) => {
      setAuthStatus(queryClient, status);
    },
    [queryClient]
  );

  /**
   * Clear auth state after logout
   *
   * Invalidates the query cache - no need for callers to also call invalidateAuthStatus
   */
  const onLogout = useCallback(() => {
    invalidateAuthStatus(queryClient);
  }, [queryClient]);

  // ============================================================================
  // Tab Visibility Handling
  // ============================================================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - check token status
        if (expiresAt) {
          const now = Date.now();
          if (expiresAt <= now) {
            // Token expired while tab was hidden
            // Update cache to reflect expired state - SessionExpiredDialog will show
            if (isAuthenticated) {
              setAuthStatus(queryClient, {
                isAuthenticated: false,
                canRefresh,
                expiresAt,
                user,
              });
            }
          } else if (expiresAt - DEFAULT_REFRESH_BEFORE_MS <= now) {
            // Within refresh window but not expired - refresh silently
            refetch();
          }
          // If still valid and not in refresh window, refetchInterval will handle it
        }
      }
      // Tab hidden - refetchIntervalInBackground: false handles pausing
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expiresAt, isAuthenticated, canRefresh, user, refetch, queryClient]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      canRefresh,
      expiresAt,
      sessionState,
      isRefreshing,
      refresh,
      onLoginSuccess,
      onLogout,
    }),
    [
      user,
      isAuthenticated,
      canRefresh,
      expiresAt,
      sessionState,
      isRefreshing,
      refresh,
      onLoginSuccess,
      onLogout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
