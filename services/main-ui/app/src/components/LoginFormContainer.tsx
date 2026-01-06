import { useCallback, useEffect, useRef, useState } from 'react';
import { LoginForm } from '@lib/ui';
import { FaGoogle } from 'react-icons/fa';
import type { LoginFormProps } from '@lib/ui';
import { initiateMagicLink, initiateSocialLogin } from '~/server/auth';
import { useCognitoContextData } from '~/hooks/useCognitoContextData';

type SocialProvider = 'google';

/**
 * Time to wait after parent window regains focus before assuming popup was cancelled.
 * This delay allows the popup's postMessage to arrive first if login completed successfully.
 */
const POPUP_FOCUS_TIMEOUT_MS = 1000;

export interface LoginFormContainerProps {
  heading?: LoginFormProps['heading'];

  /**
   * Redirect path after successful login
   * Defaults to '/' if not provided
   */
  redirectPath?: string;
  /**
   * Callback when login is successful
   * Optional - use for dialog scenarios where you want to close the dialog
   */
  onSuccess?: () => void;
  /**
   * Mode of operation: 'page' uses redirect, 'modal' uses popup for social login
   * Defaults to 'page'
   */
  mode?: 'page' | 'modal';
}

/**
 * Shared login form container with magic link and social authentication logic
 *
 * This component can be used in both the /login page and login dialog.
 * It handles all the authentication logic including:
 * - Magic link initiation
 * - Social OAuth login (redirect in page mode, popup in modal mode)
 * - Error handling
 * - Success state management
 *
 * ## Popup Detection Strategy (Modal Mode)
 *
 * For social login in modal mode, we open a popup window that redirects to the
 * OAuth provider (e.g., Google). We need to detect when the popup closes to:
 * 1. Handle successful login (popup sends postMessage before closing)
 * 2. Handle user cancellation (popup closed without completing login)
 *
 * ### Why not use `popup.closed`?
 *
 * The traditional approach is to poll `popup.closed` in a setInterval. However,
 * this triggers Cross-Origin-Opener-Policy (COOP) warnings because:
 * - The popup navigates to a different origin (Google's OAuth page)
 * - COOP headers block cross-origin access to `window.closed`
 *
 * ### Our Approach: Focus-based Detection
 *
 * Instead of polling `popup.closed`, we use the window `focus` event:
 *
 * 1. When popup opens, we store a reference and set `popupCompletedRef = false`
 * 2. If login succeeds/fails, popup sends postMessage and sets `popupCompletedRef = true`
 * 3. When parent window regains focus (popup closed or user switched back):
 *    - Wait POPUP_FOCUS_TIMEOUT_MS for any pending postMessage
 *    - If `popupCompletedRef` is still false, assume user cancelled
 *
 * This avoids COOP restrictions while still detecting popup closure reliably.
 */
export function LoginFormContainer({
  redirectPath = '/',
  onSuccess,
  mode = 'page',
  heading,
}: LoginFormContainerProps) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(
    null
  );

  /**
   * Reference to the popup window (for social login in modal mode).
   * Used to track if a popup is currently open.
   */
  const popupRef = useRef<Window | null>(null);

  /**
   * Tracks whether the popup completed authentication (success or error).
   * If true, the popup sent a postMessage before closing.
   * If false when focus returns, user likely cancelled by closing the popup.
   */
  const popupCompletedRef = useRef(false);

  const { getEncodedData } = useCognitoContextData();

  /**
   * Handle postMessage from popup window (for social login in modal mode).
   * The popup sends a message when authentication completes (success or error).
   */
  const handlePopupMessage = useCallback(
    (event: MessageEvent) => {
      // Verify origin for security - only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'social-login-success') {
        // Mark as completed so focus handler doesn't show "cancelled"
        popupCompletedRef.current = true;
        setLoadingProvider(null);
        onSuccess?.();
      } else if (event.data?.type === 'social-login-error') {
        // Mark as completed so focus handler doesn't show "cancelled"
        popupCompletedRef.current = true;
        setLoadingProvider(null);
        setErrorMessage(event.data.error || 'Social login failed');
      }
    },
    [onSuccess]
  );

  /**
   * Handle window focus to detect popup closure without using popup.closed.
   *
   * When the parent window regains focus, it could mean:
   * 1. User closed the popup without completing login
   * 2. User clicked back to parent while popup is still open
   * 3. Popup completed and closed itself (postMessage already received)
   *
   * We wait POPUP_FOCUS_TIMEOUT_MS to let any pending postMessage arrive,
   * then check if popupCompletedRef is still false to detect cancellation.
   */
  const handleWindowFocus = useCallback(() => {
    // Only handle if we have an active popup login in progress
    if (!loadingProvider || !popupRef.current) return;

    // Wait for any pending postMessage from popup before assuming cancelled
    setTimeout(() => {
      // If popup completed via postMessage, don't show cancelled message
      if (popupCompletedRef.current) return;

      // Still loading after focus returned and timeout elapsed = user likely closed popup
      setLoadingProvider((current) => {
        if (current) {
          setErrorMessage('Login cancelled');
          return null;
        }
        return current;
      });
      popupRef.current = null;
    }, POPUP_FOCUS_TIMEOUT_MS);
  }, [loadingProvider]);

  // Set up event listeners for popup communication (modal mode only)
  useEffect(() => {
    if (mode === 'modal') {
      // Listen for postMessage from popup (success/error)
      window.addEventListener('message', handlePopupMessage);
      // Listen for focus to detect popup closure
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        window.removeEventListener('message', handlePopupMessage);
        window.removeEventListener('focus', handleWindowFocus);
      };
    }
  }, [mode, handlePopupMessage, handleWindowFocus]);

  const handleMagicLinkRequest = async (email: string) => {
    setErrorMessage(undefined);

    try {
      // Construct the redirect URI (where the magic link will redirect back to)
      const redirectUri = `${window.location.origin}/auth/magic-link`;

      // Collect device fingerprint data for Cognito adaptive authentication
      const encodedData = getEncodedData(email);

      // Call the server function to initiate magic link
      // Server function sets HttpOnly cookies for session and redirect path
      const result = await initiateMagicLink({
        data: {
          email,
          redirectUri,
          redirectPath,
          encodedData,
        },
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to send magic link');
        return;
      }

      // Success - the LoginForm will show the success message internally
      // Note: We don't call onSuccess here because the user still needs to
      // click the magic link in their email to complete login.
      // The modal should stay open showing the "check your email" message.
      // For page mode, the user will navigate away when they click the link.
      // For modal mode, the user will close the modal manually or the page
      // will refresh when they complete login in another tab.
    } catch (error) {
      console.error('Error requesting magic link:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  const handleSocialLogin = useCallback(
    async (provider: SocialProvider) => {
      setErrorMessage(undefined);
      setLoadingProvider(provider);

      try {
        // Construct the redirect URI from the current origin
        const redirectUri = `${window.location.origin}/auth/social-login`;

        // Collect device fingerprint data for Cognito adaptive authentication
        // For social login initiation, we don't have a username yet, so pass empty string
        const encodedData = getEncodedData('');

        const result = await initiateSocialLogin({
          data: {
            provider,
            redirectUri,
            redirectPath,
            encodedData,
          },
        });

        if (result.success) {
          if (mode === 'modal') {
            // Reset completion flag for new login attempt
            popupCompletedRef.current = false;

            // Calculate popup position (centered on screen)
            const width = 500;
            const height = 600;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            // Open popup for OAuth flow
            const popup = window.open(
              result.authUrl,
              'social-login',
              `width=${width},height=${height},left=${left},top=${top},popup=yes`
            );

            if (!popup) {
              // Popup blocked by browser - fallback to redirect flow
              console.warn('Popup blocked, falling back to redirect');
              window.location.href = result.authUrl;
              return;
            }

            // Store reference for focus-based closure detection
            popupRef.current = popup;

            // Popup closure is detected via handleWindowFocus (not polling popup.closed)
            // This avoids Cross-Origin-Opener-Policy (COOP) restrictions
          } else {
            // Page mode: redirect to OAuth URL directly
            window.location.href = result.authUrl;
          }
        } else {
          setErrorMessage(
            result.error || `Failed to initiate ${provider} login`
          );
          setLoadingProvider(null);
        }
      } catch (error) {
        console.error(`Error initiating ${provider} login:`, error);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setLoadingProvider(null);
      }
    },
    [mode, redirectPath, getEncodedData]
  );

  return (
    <LoginForm
      heading={heading}
      onMagicLinkRequest={handleMagicLinkRequest}
      onUsernameVerified={() =>
        Promise.resolve({
          methods: ['magic-link'],
        })
      }
      socialProviders={[
        {
          id: 'google',
          label: 'Sign in with Google',
          icon: <FaGoogle />,
          onClick: () => handleSocialLogin('google'),
          show: true,
          loading: loadingProvider === 'google',
        },
      ]}
      magicLink={{
        enabled: true,
        buttonText: 'Send me a magic link',
        successMessage: {
          title: 'Check your email',
          description: (email: string) =>
            `We've sent a magic link to ${email}. Click the link in the email to sign in. The link will expire in 15 minutes.`,
          actionText: 'try again',
        },
      }}
      password={{
        enabled: false,
      }}
      signUp={{
        enabled: false,
      }}
      passwordError={errorMessage}
    />
  );
}
