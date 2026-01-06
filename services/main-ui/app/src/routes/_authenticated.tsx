/**
 * _authenticated Layout Route
 *
 * This layout route wraps all protected routes that require authentication.
 * It uses the auth context from the root route to:
 * - Redirect unauthenticated users to /login page (on navigation)
 * - Show SessionExpiredDialog when session expires while already on page
 *
 * Auth flow:
 * - Navigation while not authenticated: Redirect to /login?redirect={path}
 * - Session expires while on page: Show SessionExpiredDialog (user clicks "Try Again")
 * - Refresh fails: SessionExpiredDialog opens LoginModal for re-auth
 *
 * Usage:
 * Routes under /routes/_authenticated/ will be protected.
 * e.g., /routes/_authenticated/dashboard.tsx -> /dashboard
 */

import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { SessionExpiredDialog } from '~/components/SessionExpiredDialog';
import { useLoginModal } from '~/providers/LoginModalProvider';
import { useAuth } from '~/providers/AuthProvider';
import { getAuthStatus } from '~/server/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    // Access auth from parent (root) context - no server call needed
    // The root route's beforeLoad already fetched auth status (with caching)
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, canRefresh, refresh, onLoginSuccess } = useAuth();
  const { closeLoginModal } = useLoginModal();

  // Track if user was authenticated when component mounted
  // This distinguishes "session expired while on page" from "navigated while expired"
  // The beforeLoad guard ensures user IS authenticated on mount, so we start with true.
  // We reset to true when user successfully re-authenticates via handleLoginSuccess.
  const [wasAuthenticated, setWasAuthenticated] = useState(true);

  // Handle successful login (called from SessionExpiredDialog -> LoginModal)
  const handleLoginSuccess = useCallback(async () => {
    const status = await getAuthStatus();
    if (status.isAuthenticated) {
      // onLoginSuccess updates the query cache (single source of truth)
      onLoginSuccess(status);
      closeLoginModal();
      // Reset wasAuthenticated since user is now authenticated again
      setWasAuthenticated(true);
    }
  }, [onLoginSuccess, closeLoginModal]);

  // Show SessionExpiredDialog only when:
  // - User was authenticated when they entered this page (passed beforeLoad)
  // - Session has since expired (not authenticated anymore)
  // - We have a refresh token to try
  const showExpiredDialog = wasAuthenticated && !isAuthenticated && canRefresh;

  return (
    <>
      {showExpiredDialog && (
        <SessionExpiredDialog
          open={true}
          onRefresh={refresh}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      <Outlet />
    </>
  );
}
