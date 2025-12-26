import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { LoginForm } from './login-form';
import type { LoginMethodsResponse } from './login-form';

// Helper to render with ChakraProvider
function renderLoginForm(props = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <LoginForm {...props} />
    </ChakraProvider>
  );
}

describe('LoginForm', () => {
  describe('Email Validation', () => {
    it('should show error when submitting empty email', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(
        await screen.findByText('Email address is required')
      ).toBeInTheDocument();
    });

    it('should show error when submitting invalid email format', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'notanemail');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(
        await screen.findByText('Please enter a valid email address')
      ).toBeInTheDocument();
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(
        await screen.findByText('Email address is required')
      ).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 't');

      expect(
        screen.queryByText('Email address is required')
      ).not.toBeInTheDocument();
    });

    it('should use custom validation when onValidateEmail is provided', async () => {
      const user = userEvent.setup();
      const customValidate = vi.fn((email: string) => {
        if (email === 'blocked@example.com') {
          return 'This email is blocked';
        }
        return undefined;
      });

      renderLoginForm({ onValidateEmail: customValidate });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'blocked@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(
        await screen.findByText('This email is blocked')
      ).toBeInTheDocument();
      expect(customValidate).toHaveBeenCalledWith('blocked@example.com');
    });

    it('should proceed to password step with valid email', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should now be on password step
      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
      });
    });
  });

  describe('Two-Step Navigation', () => {
    it('should navigate to password step after valid email', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      // Start on email step
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should be on password step
      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
      });

      // Email should be shown in disabled input
      const disabledEmailInput = screen.getByDisplayValue('user@example.com');
      expect(disabledEmailInput).toBeDisabled();
    });

    it('should navigate back to email step when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginForm();

      // Navigate to password step
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should be back on email step
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
      });

      // Email should be preserved
      const emailInputAgain = screen.getByLabelText(/email/i);
      expect(emailInputAgain).toHaveValue('user@example.com');
    });
  });

  describe('Async Email Verification', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should show loading state during email verification', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(async (): Promise<LoginMethodsResponse> => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { methods: ['password'] };
      });

      renderLoginForm({ onEmailVerified });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Button should show loading state
      expect(continueButton).toBeDisabled();

      // Wait for verification to complete
      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
      });
    });

    it('should handle verification error', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(async (): Promise<LoginMethodsResponse> => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          methods: [],
          error: 'Account not found',
        };
      });

      renderLoginForm({ onEmailVerified });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should show error and stay on email step
      expect(await screen.findByText('Account not found')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should handle empty methods array', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(async (): Promise<LoginMethodsResponse> => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { methods: [] };
      });

      renderLoginForm({ onEmailVerified });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should show error for empty methods
      expect(
        await screen.findByText('No login methods available for this account')
      ).toBeInTheDocument();
    });

    it('should handle verification exception', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(async () => {
        throw new Error('Network error');
      });

      renderLoginForm({ onEmailVerified });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should show generic error message
      expect(
        await screen.findByText(
          'Unable to verify email. Please try again later.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Dynamic Login Methods', () => {
    it('should show only password input when methods contain password only', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(
        async (): Promise<LoginMethodsResponse> => ({
          methods: ['password'],
        })
      );

      renderLoginForm({ onEmailVerified });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
      });

      // Should not show magic link button
      expect(
        screen.queryByRole('button', { name: /email me a login link/i })
      ).not.toBeInTheDocument();
    });

    it('should show only magic link button when methods contain magic-link only', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(
        async (): Promise<LoginMethodsResponse> => ({
          methods: ['magic-link'],
        })
      );
      const onMagicLinkRequest = vi.fn();

      renderLoginForm({ onEmailVerified, onMagicLinkRequest });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /email me a login link/i })
        ).toBeInTheDocument();
      });

      // Should not show password input
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('should show both password and magic link when methods contain both', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(
        async (): Promise<LoginMethodsResponse> => ({
          methods: ['password', 'magic-link'],
        })
      );
      const onMagicLinkRequest = vi.fn();

      renderLoginForm({ onEmailVerified, onMagicLinkRequest });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /email me a login link/i })
        ).toBeInTheDocument();
      });
    });

    it('should call onMagicLinkRequest when magic link button is clicked', async () => {
      const user = userEvent.setup();
      const onEmailVerified = vi.fn(
        async (): Promise<LoginMethodsResponse> => ({
          methods: ['magic-link'],
        })
      );
      const onMagicLinkRequest = vi.fn();

      renderLoginForm({ onEmailVerified, onMagicLinkRequest });

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'user@example.com');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /email me a login link/i })
        ).toBeInTheDocument();
      });

      const magicLinkButton = screen.getByRole('button', {
        name: /email me a login link/i,
      });
      await user.click(magicLinkButton);

      expect(onMagicLinkRequest).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('Password Validation', () => {
    it('should show error when submitting empty password', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderLoginForm({ onSubmit, defaultEmail: 'user@example.com' });

      // Should start on password step due to defaultEmail
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(
        await screen.findByText('Password is required')
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should clear password error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginForm({ defaultEmail: 'user@example.com' });

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      expect(
        await screen.findByText('Password is required')
      ).toBeInTheDocument();

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'p');

      expect(
        screen.queryByText('Password is required')
      ).not.toBeInTheDocument();
    });

    it('should call onSubmit with email and password when form is valid', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderLoginForm({ onSubmit, defaultEmail: 'user@example.com' });

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'mypassword123');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'user@example.com',
          'mypassword123'
        );
      });
    });

    it('should show custom password error from prop', () => {
      renderLoginForm({
        defaultEmail: 'user@example.com',
        passwordError: 'Password must be at least 8 characters',
      });

      expect(
        screen.getByText('Password must be at least 8 characters')
      ).toBeInTheDocument();
    });
  });

  describe('Default Email Prop', () => {
    it('should start on password step when defaultEmail is provided', () => {
      renderLoginForm({ defaultEmail: 'user@example.com' });

      // Should be on password step
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      // Email should be shown in disabled input
      const emailInput = screen.getByDisplayValue('user@example.com');
      expect(emailInput).toBeDisabled();
    });

    it('should start on email step when defaultEmail is not provided', () => {
      renderLoginForm();

      // Should be on email step
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('should allow editing email when starting with defaultEmail', async () => {
      const user = userEvent.setup();
      renderLoginForm({ defaultEmail: 'user@example.com' });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should be back on email step
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Email should be preserved
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveValue('user@example.com');
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when isLoading is true', () => {
      renderLoginForm({
        isLoading: true,
        defaultEmail: 'user@example.com',
      });

      // When loading, the button text may be replaced by a spinner
      // Find all buttons with type="submit"
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(
        (btn) => btn.getAttribute('type') === 'submit'
      );
      expect(submitButton).toBeDefined();
      expect(submitButton).toHaveAttribute('disabled');
    });

    it('should disable continue button when isLoading is true on email step', () => {
      renderLoginForm({ isLoading: true });

      // When loading, the button text may be replaced by a spinner
      const buttons = screen.getAllByRole('button');
      const continueButton = buttons.find(
        (btn) => btn.getAttribute('type') === 'submit'
      );
      expect(continueButton).toBeDefined();
      expect(continueButton).toHaveAttribute('disabled');
    });
  });

  describe('Optional Features', () => {
    it('should hide title when showTitle is false', () => {
      renderLoginForm({ showTitle: false });

      expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
    });

    it('should hide subtitle when showSubtitle is false', () => {
      renderLoginForm({ showSubtitle: false });

      expect(
        screen.queryByText('Start using Chakra in your projects')
      ).not.toBeInTheDocument();
    });

    it('should hide remember me when showRememberMe is false', () => {
      renderLoginForm({
        showRememberMe: false,
        defaultEmail: 'user@example.com',
      });

      expect(screen.queryByText('Remember me')).not.toBeInTheDocument();
    });

    it('should hide forgot password when showForgotPassword is false', () => {
      renderLoginForm({
        showForgotPassword: false,
        defaultEmail: 'user@example.com',
      });

      expect(screen.queryByText('Forgot password')).not.toBeInTheDocument();
    });

    it('should hide sign up link when showSignUpLink is false', () => {
      renderLoginForm({ showSignUpLink: false });

      expect(
        screen.queryByText("Don't have an account?")
      ).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onForgotPassword when forgot password link is clicked', async () => {
      const user = userEvent.setup();
      const onForgotPassword = vi.fn();

      renderLoginForm({
        onForgotPassword,
        defaultEmail: 'user@example.com',
      });

      const forgotPasswordLink = screen.getByText('Forgot password');
      await user.click(forgotPasswordLink);

      expect(onForgotPassword).toHaveBeenCalled();
    });

    it('should call onSignUp when sign up link is clicked', async () => {
      const user = userEvent.setup();
      const onSignUp = vi.fn();

      renderLoginForm({ onSignUp });

      const signUpLink = screen.getByText('Sign up');
      await user.click(signUpLink);

      expect(onSignUp).toHaveBeenCalled();
    });
  });
});
