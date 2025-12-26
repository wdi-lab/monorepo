import {
  Button,
  Checkbox,
  Field,
  Flex,
  IconButton,
  Input,
  InputGroup,
  Stack,
} from '../../chakra';
import { PasswordInput } from '../password-input';
import { LuPencil } from 'react-icons/lu';
import { LoginDivider } from './login-divider';

export type LoginMethod = 'password' | 'magic-link';

export interface LoginPasswordStepProps {
  email: string;
  emailLabel?: string;
  passwordLabel?: string;
  passwordError?: string;
  submitButtonText?: string;
  magicLinkButtonText?: string;
  rememberMeLabel?: string;
  forgotPasswordText?: string;
  showRememberMe?: boolean;
  showForgotPassword?: boolean;
  availableMethods?: LoginMethod[];
  isLoading?: boolean;
  onBack?: () => void;
  onForgotPassword?: () => void;
  onMagicLinkRequest?: () => void;
  onPasswordChange?: () => void;
}

export function LoginPasswordStep({
  email,
  emailLabel = 'Email',
  passwordLabel = 'Password',
  passwordError,
  submitButtonText = 'Sign in',
  magicLinkButtonText = 'Email me a login link',
  rememberMeLabel = 'Remember me',
  forgotPasswordText = 'Forgot password',
  showRememberMe = true,
  showForgotPassword = true,
  availableMethods = ['password'],
  isLoading = false,
  onBack,
  onForgotPassword,
  onMagicLinkRequest,
  onPasswordChange,
}: LoginPasswordStepProps) {
  const showPassword = availableMethods.includes('password');
  const showMagicLink = availableMethods.includes('magic-link');

  return (
    <>
      <Stack gap={4}>
        <Field.Root>
          <Field.Label>{emailLabel}</Field.Label>
          <InputGroup
            endElement={
              <IconButton
                tabIndex={-1}
                me="-2"
                aspectRatio="square"
                size="sm"
                variant="ghost"
                height="calc(100% - {spacing.2})"
                aria-label="Edit email"
                onClick={onBack}
              >
                <LuPencil />
              </IconButton>
            }
          >
            <Input value={email} disabled size="lg" />
          </InputGroup>
        </Field.Root>

        {showPassword && (
          <Field.Root invalid={!!passwordError}>
            <Field.Label>{passwordLabel}</Field.Label>
            <PasswordInput
              name="password"
              disabled={isLoading}
              size="lg"
              autoFocus
              onChange={onPasswordChange}
            />
            {passwordError && (
              <Field.ErrorText>{passwordError}</Field.ErrorText>
            )}
          </Field.Root>
        )}
      </Stack>

      {showPassword && (showRememberMe || showForgotPassword) && (
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

      {showPassword && (
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
      )}

      {showPassword && showMagicLink && <LoginDivider text="or" />}

      {showMagicLink && (
        <Button
          type="button"
          width="full"
          variant="outline"
          size="lg"
          onClick={onMagicLinkRequest}
          disabled={isLoading}
        >
          {magicLinkButtonText}
        </Button>
      )}
    </>
  );
}
