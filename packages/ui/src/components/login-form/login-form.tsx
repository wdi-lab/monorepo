import { useState } from 'react';
import { Box, VStack } from '../../chakra';
import { LoginHeader } from './login-header';
import { LoginEmailStep } from './login-email-step';
import { LoginPasswordStep } from './login-password-step';
import type { SocialProvider } from './login-social-providers';

export type LoginMethod = 'password' | 'magic-link';

export interface LoginMethodsResponse {
  methods: LoginMethod[];
  error?: string;
}

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void;
  onMagicLinkRequest?: (email: string) => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  onValidateEmail?: (email: string) => string | undefined;
  onEmailVerified?: (email: string) => Promise<LoginMethodsResponse>;
  socialProviders?: SocialProvider[];
  title?: string;
  subtitle?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  submitButtonText?: string;
  continueButtonText?: string;
  rememberMeLabel?: string;
  forgotPasswordText?: string;
  signUpText?: string;
  signUpLinkText?: string;
  magicLinkButtonText?: string;
  isLoading?: boolean;
  passwordError?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  showSignUpLink?: boolean;
  logo?: React.ReactNode;
  defaultEmail?: string;
}

export function LoginForm({
  onSubmit,
  onMagicLinkRequest,
  onForgotPassword,
  onSignUp,
  onValidateEmail,
  onEmailVerified,
  socialProviders,
  title = 'Welcome back',
  subtitle = 'Start using Chakra in your projects',
  emailLabel = 'Email',
  emailPlaceholder = 'you@example.com',
  passwordLabel = 'Password',
  submitButtonText = 'Sign in',
  continueButtonText = 'Continue',
  rememberMeLabel = 'Remember me',
  forgotPasswordText = 'Forgot password',
  signUpText = "Don't have an account?",
  signUpLinkText = 'Sign up',
  magicLinkButtonText = 'Email me a login link',
  isLoading = false,
  passwordError,
  showTitle = true,
  showSubtitle = true,
  showRememberMe = true,
  showForgotPassword = true,
  showSignUpLink = true,
  logo,
  defaultEmail,
}: LoginFormProps) {
  const [step, setStep] = useState<'email' | 'password'>(
    defaultEmail ? 'password' : 'email'
  );
  const [email, setEmail] = useState(defaultEmail || '');
  const [currentEmailError, setCurrentEmailError] = useState<
    string | undefined
  >();
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | undefined
  >();
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<LoginMethod[]>([
    'password',
  ]);

  const defaultValidateEmail = (email: string): string | undefined => {
    if (!email || email.trim() === '') {
      return 'Email address is required';
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateEmail = onValidateEmail || defaultValidateEmail;

  const handleEmailSubmit: React.FormEventHandler<HTMLFormElement> = async (
    e
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get('email') as string;

    const validationError = validateEmail(emailValue);
    if (validationError) {
      setCurrentEmailError(validationError);
      return;
    }

    setCurrentEmailError(undefined);
    setEmail(emailValue);

    // If onEmailVerified callback is provided, call it to get available login methods
    if (onEmailVerified) {
      setIsVerifyingEmail(true);
      try {
        const response = await onEmailVerified(emailValue);
        if (response.error) {
          setCurrentEmailError(response.error);
          setIsVerifyingEmail(false);
          return;
        }
        // Check if methods array is empty
        if (!response.methods || response.methods.length === 0) {
          setCurrentEmailError('No login methods available for this account');
          setIsVerifyingEmail(false);
          return;
        }
        setAvailableMethods(response.methods);
        setIsVerifyingEmail(false);
      } catch {
        setCurrentEmailError('Unable to verify email. Please try again later.');
        setIsVerifyingEmail(false);
        return;
      }
    }

    setStep('password');
  };

  const handlePasswordSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    // Validate password is not empty
    if (!password || password.trim() === '') {
      setCurrentPasswordError('Password is required');
      return;
    }

    setCurrentPasswordError(undefined);
    onSubmit?.(email, password);
  };

  const handleMagicLinkRequest = () => {
    onMagicLinkRequest?.(email);
  };

  const handleBack = () => {
    setStep('email');
  };

  if (step === 'email') {
    return (
      <Box
        as="form"
        onSubmit={
          handleEmailSubmit as unknown as React.FormEventHandler<HTMLDivElement>
        }
        width="full"
        maxWidth="sm"
        minWidth={{ sm: 'auto', md: '384px' }}
        mx="auto"
        my={{ base: 0, md: 'auto' }}
        px={{ base: 4, md: 0 }}
        pt={{ base: 8, md: 0 }}
      >
        <VStack gap={8} align="stretch">
          <LoginHeader
            logo={logo}
            title={title}
            subtitle={subtitle}
            showTitle={showTitle}
            showSubtitle={showSubtitle}
          />

          <LoginEmailStep
            email={email}
            emailError={currentEmailError}
            emailLabel={emailLabel}
            emailPlaceholder={emailPlaceholder}
            continueButtonText={continueButtonText}
            isLoading={isLoading || isVerifyingEmail}
            onEmailChange={() => setCurrentEmailError(undefined)}
            socialProviders={socialProviders}
            showSignUpLink={showSignUpLink}
            signUpText={signUpText}
            signUpLinkText={signUpLinkText}
            onSignUp={onSignUp}
          />
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      as="form"
      onSubmit={
        handlePasswordSubmit as unknown as React.FormEventHandler<HTMLDivElement>
      }
      width="full"
      maxWidth="sm"
      minWidth={{ base: 'auto', md: '384px' }}
      mx="auto"
      my={{ base: 0, md: 'auto' }}
      pt={{ base: 8, md: 0 }}
    >
      <VStack gap={8} align="stretch">
        <LoginHeader
          logo={logo}
          title={title}
          subtitle={subtitle}
          showTitle={showTitle}
          showSubtitle={showSubtitle}
        />

        <LoginPasswordStep
          email={email}
          emailLabel={emailLabel}
          passwordLabel={passwordLabel}
          passwordError={currentPasswordError || passwordError}
          submitButtonText={submitButtonText}
          magicLinkButtonText={magicLinkButtonText}
          rememberMeLabel={rememberMeLabel}
          forgotPasswordText={forgotPasswordText}
          showRememberMe={showRememberMe}
          showForgotPassword={showForgotPassword}
          availableMethods={availableMethods}
          isLoading={isLoading}
          onBack={handleBack}
          onForgotPassword={onForgotPassword}
          onMagicLinkRequest={handleMagicLinkRequest}
          onPasswordChange={() => setCurrentPasswordError(undefined)}
        />
      </VStack>
    </Box>
  );
}
