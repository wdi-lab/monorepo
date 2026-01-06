import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from './AuthProvider';
import type { AuthStatus } from './AuthProvider';

import type { ReactNode } from 'react';

import * as authStatusModule from '~/queries/auth/authStatus';
import { refreshTokens } from '~/server/auth';

// Mock the server auth module
vi.mock('~/server/auth', () => ({
  refreshTokens: vi.fn(),
}));

// Mock the authStatus module
vi.mock('~/queries/auth/authStatus', async (importOriginal) => {
  const original = await (
    importOriginal as unknown as () => Promise<typeof authStatusModule>
  )();
  return {
    ...original,
    authStatusQueryFn: vi.fn(),
    setAuthStatus: vi.fn(),
    invalidateAuthStatus: vi.fn(),
  };
});

describe('AuthProvider', () => {
  let queryClient: QueryClient;

  const mockInitialStatus: AuthStatus = {
    isAuthenticated: true,
    canRefresh: true,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: null,
    },
  };

  const createWrapper = (initialStatus: AuthStatus = mockInitialStatus) => {
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialStatus={initialStatus}>{children}</AuthProvider>
        </QueryClientProvider>
      );
    }
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    queryClient.clear();
    vi.useRealTimers();
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('returns initial auth status', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.canRefresh).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
      expect(result.current.sessionState).toBe('active');
    });
  });

  describe('sessionState', () => {
    it('returns "active" when authenticated', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isAuthenticated: true,
          canRefresh: true,
          expiresAt: Date.now() + 60000,
          user: null,
        }),
      });

      expect(result.current.sessionState).toBe('active');
    });

    it('returns "expired" when not authenticated but can refresh', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isAuthenticated: false,
          canRefresh: true,
          expiresAt: Date.now() - 1000,
          user: null,
        }),
      });

      expect(result.current.sessionState).toBe('expired');
    });

    it('returns "login" when not authenticated and cannot refresh', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isAuthenticated: false,
          canRefresh: false,
          expiresAt: null,
          user: null,
        }),
      });

      expect(result.current.sessionState).toBe('login');
    });
  });

  describe('refresh', () => {
    it('updates auth status on successful refresh', async () => {
      vi.mocked(refreshTokens).mockResolvedValue({
        success: true,
        expiresAt: Date.now() + 3600000,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: null,
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      let refreshResult: boolean;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(refreshResult!).toBe(true);
      expect(authStatusModule.setAuthStatus).toHaveBeenCalledWith(queryClient, {
        isAuthenticated: true,
        canRefresh: true,
        expiresAt: expect.any(Number),
        user: expect.objectContaining({ email: 'test@example.com' }),
      });
    });

    it('updates auth status to failed state on refresh failure', async () => {
      vi.mocked(refreshTokens).mockResolvedValue({
        success: false,
        error: 'Refresh token expired',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      let refreshResult: boolean;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(refreshResult!).toBe(false);
      expect(authStatusModule.setAuthStatus).toHaveBeenCalledWith(queryClient, {
        isAuthenticated: false,
        canRefresh: false,
        expiresAt: null,
        user: null,
      });
    });

    it('handles refresh error gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      vi.mocked(refreshTokens).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      let refreshResult: boolean;
      await act(async () => {
        refreshResult = await result.current.refresh();
      });

      expect(refreshResult!).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Token refresh error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('onLoginSuccess', () => {
    it('updates query cache with new auth status', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper({
          isAuthenticated: false,
          canRefresh: false,
          expiresAt: null,
          user: null,
        }),
      });

      const newStatus: AuthStatus = {
        isAuthenticated: true,
        canRefresh: true,
        expiresAt: Date.now() + 3600000,
        user: {
          id: 'new-user',
          email: 'new@example.com',
          name: 'New User',
          picture: null,
        },
      };

      act(() => {
        result.current.onLoginSuccess(newStatus);
      });

      expect(authStatusModule.setAuthStatus).toHaveBeenCalledWith(
        queryClient,
        newStatus
      );
    });
  });

  describe('onLogout', () => {
    it('invalidates auth status cache', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.onLogout();
      });

      expect(authStatusModule.invalidateAuthStatus).toHaveBeenCalledWith(
        queryClient
      );
    });
  });

  describe('isRefreshing', () => {
    it('is false initially', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('tab visibility handling', () => {
    it('sets up visibility change listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('removes visibility change listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
