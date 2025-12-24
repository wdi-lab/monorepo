import {
  Box,
  Button,
  Checkbox,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  VStack,
  ChakraLink,
} from '../../chakra';
import { PasswordInput } from '../password-input';
import { FaGoogle } from 'react-icons/fa';

export interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  onGoogleSignIn?: () => void;
  title?: string;
  subtitle?: string;
  emailLabel?: string;
  passwordLabel?: string;
  submitButtonText?: string;
  rememberMeLabel?: string;
  forgotPasswordText?: string;
  googleButtonText?: string;
  signUpText?: string;
  signUpLinkText?: string;
  isLoading?: boolean;
  emailError?: string;
  passwordError?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  showGoogleSignIn?: boolean;
  showSignUpLink?: boolean;
  logo?: React.ReactNode;
}

export function LoginForm({
  onSubmit,
  onForgotPassword,
  onSignUp,
  onGoogleSignIn,
  title = 'Welcome back',
  subtitle = 'Start using Chakra in your projects',
  emailLabel = 'Email',
  passwordLabel = 'Password',
  submitButtonText = 'Sign in',
  rememberMeLabel = 'Remember me',
  forgotPasswordText = 'Forgot password',
  googleButtonText = 'Sign in with Google',
  signUpText = "Don't have an account?",
  signUpLinkText = 'Sign up',
  isLoading = false,
  emailError,
  passwordError,
  showTitle = true,
  showSubtitle = true,
  showRememberMe = true,
  showForgotPassword = true,
  showGoogleSignIn = true,
  showSignUpLink = true,
  logo,
}: LoginFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    onSubmit?.(email, password);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} width="full" maxWidth="sm" mx="auto">
      <VStack gap={8} align="stretch">
        {logo && (
          <Box textAlign="center" mb={2}>
            {logo}
          </Box>
        )}

        {showTitle && (
          <VStack gap={2}>
            <Heading size="2xl" fontWeight="semibold" textAlign="center">
              {title}
            </Heading>
            {showSubtitle && (
              <Text color="fg.muted" textAlign="center">
                {subtitle}
              </Text>
            )}
          </VStack>
        )}

        <Stack gap={4}>
          <Field.Root invalid={!!emailError}>
            <Field.Label>{emailLabel}</Field.Label>
            <Input name="email" type="email" disabled={isLoading} size="lg" />
            {emailError && <Field.ErrorText>{emailError}</Field.ErrorText>}
          </Field.Root>

          <Field.Root invalid={!!passwordError}>
            <Field.Label>{passwordLabel}</Field.Label>
            <PasswordInput name="password" disabled={isLoading} size="lg" />
            {passwordError && (
              <Field.ErrorText>{passwordError}</Field.ErrorText>
            )}
          </Field.Root>
        </Stack>

        {(showRememberMe || showForgotPassword) && (
          <Flex justify="space-between" align="center">
            {showRememberMe && (
              <Checkbox.Root defaultChecked size="sm">
                <Checkbox.HiddenInput name="remember" />
                <Checkbox.Control />
                <Checkbox.Label>{rememberMeLabel}</Checkbox.Label>
              </Checkbox.Root>
            )}
            {showForgotPassword && (
              <Button
                variant="plain"
                size="sm"
                colorPalette="teal"
                onClick={onForgotPassword}
                type="button"
              >
                {forgotPasswordText}
              </Button>
            )}
          </Flex>
        )}

        <Stack gap={3}>
          <Button
            type="submit"
            width="full"
            colorPalette="teal"
            size="lg"
            loading={isLoading}
            disabled={isLoading}
          >
            {submitButtonText}
          </Button>

          {showGoogleSignIn && (
            <Button
              type="button"
              width="full"
              variant="outline"
              size="lg"
              onClick={onGoogleSignIn}
              disabled={isLoading}
            >
              <FaGoogle />
              {googleButtonText}
            </Button>
          )}
        </Stack>

        {showSignUpLink && (
          <Text textAlign="center" color="fg.muted">
            {signUpText}{' '}
            <ChakraLink
              colorPalette="teal"
              fontWeight="medium"
              onClick={onSignUp}
              cursor="pointer"
            >
              {signUpLinkText}
            </ChakraLink>
          </Text>
        )}
      </VStack>
    </Box>
  );
}
