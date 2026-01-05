import { useState } from 'react';
import { LoginForm } from '@lib/ui';
import { FaGoogle } from 'react-icons/fa';
import { initiateMagicLink } from '~/server/auth';

export interface LoginFormContainerProps {
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
}

/**
 * Shared login form container with magic link authentication logic
 *
 * This component can be used in both the /login page and login dialog.
 * It handles all the authentication logic including:
 * - Magic link initiation
 * - Google OAuth login
 * - Error handling
 * - Success state management
 */
export function LoginFormContainer({
  redirectPath = '/',
  onSuccess,
}: LoginFormContainerProps) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleMagicLinkRequest = async (email: string) => {
    setErrorMessage(undefined);

    try {
      // Construct the redirect URI (where the magic link will redirect back to)
      const redirectUri = `${window.location.origin}/auth/magic-link`;

      // Call the server function to initiate magic link
      // Server function sets HttpOnly cookies for session and redirect path
      const result = await initiateMagicLink({
        data: {
          email,
          redirectUri,
          redirectPath,
        },
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to send magic link');
        return;
      }

      // Success - the LoginForm will show the success message internally
      onSuccess?.();
    } catch (error) {
      console.error('Error requesting magic link:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth flow
    console.warn('Google login not yet implemented');
  };

  return (
    <LoginForm
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
          onClick: handleGoogleLogin,
          show: true,
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
