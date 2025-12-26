import { Button, Field, Input, Stack } from '../../chakra';
import { SocialProvider } from './login-social-providers';
import { LoginSocialProviders } from './login-social-providers';
import { LoginFooter } from './login-footer';

export interface LoginEmailStepProps {
  email: string;
  emailError?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  continueButtonText?: string;
  isLoading?: boolean;
  onEmailChange?: () => void;
  socialProviders?: SocialProvider[];
  showSignUpLink?: boolean;
  signUpText?: string;
  signUpLinkText?: string;
  onSignUp?: () => void;
}

export function LoginEmailStep({
  email,
  emailError,
  emailLabel = 'Email',
  emailPlaceholder = 'you@example.com',
  continueButtonText = 'Continue',
  isLoading = false,
  onEmailChange,
  socialProviders,
  showSignUpLink = true,
  signUpText = "Don't have an account?",
  signUpLinkText = 'Sign up',
  onSignUp,
}: LoginEmailStepProps) {
  return (
    <>
      <Field.Root invalid={!!emailError}>
        <Field.Label>{emailLabel}</Field.Label>
        <Input
          name="email"
          disabled={isLoading}
          size="lg"
          defaultValue={email}
          placeholder={emailPlaceholder}
          autoFocus
          onChange={onEmailChange}
        />
        {emailError && <Field.ErrorText>{emailError}</Field.ErrorText>}
      </Field.Root>

      <Stack gap={3}>
        <Button
          type="submit"
          width="full"
          colorPalette="teal"
          size="lg"
          disabled={isLoading}
          loading={isLoading}
        >
          {continueButtonText}
        </Button>

        <LoginSocialProviders
          providers={socialProviders}
          isLoading={isLoading}
        />
      </Stack>

      <LoginFooter
        show={showSignUpLink}
        signUpText={signUpText}
        signUpLinkText={signUpLinkText}
        onSignUp={onSignUp}
      />
    </>
  );
}
