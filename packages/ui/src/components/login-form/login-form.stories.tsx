import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginForm } from './login-form';
import { Box } from '../../chakra';

const meta = {
  title: 'Components/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    onForgotPassword: { action: 'forgot-password' },
    onSignUp: { action: 'sign-up' },
    onGoogleSignIn: { action: 'google-sign-in' },
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
    emailLabel: {
      control: 'text',
    },
    passwordLabel: {
      control: 'text',
    },
    submitButtonText: {
      control: 'text',
    },
    isLoading: {
      control: 'boolean',
    },
    showTitle: {
      control: 'boolean',
    },
    showSubtitle: {
      control: 'boolean',
    },
    showRememberMe: {
      control: 'boolean',
    },
    showForgotPassword: {
      control: 'boolean',
    },
    showGoogleSignIn: {
      control: 'boolean',
    },
    showSignUpLink: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithLogo: Story = {
  args: {
    logo: (
      <Box
        width="12"
        height="12"
        bg="teal.500"
        borderRadius="md"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color="white"
        fontWeight="bold"
      >
        Logo
      </Box>
    ),
  },
};

export const CustomContent: Story = {
  args: {
    title: 'Sign In',
    subtitle: 'Access your account',
    submitButtonText: 'Continue',
    googleButtonText: 'Continue with Google',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithErrors: Story = {
  args: {
    emailError: 'Please enter a valid email address',
    passwordError: 'Password must be at least 8 characters',
  },
};

export const MinimalWithoutOptionalFeatures: Story = {
  args: {
    showSubtitle: false,
    showRememberMe: false,
    showForgotPassword: false,
    showGoogleSignIn: false,
    showSignUpLink: false,
  },
};

export const WithoutTitle: Story = {
  args: {
    showTitle: false,
    showSubtitle: false,
  },
};

export const WithoutGoogleSignIn: Story = {
  args: {
    showGoogleSignIn: false,
  },
};

export const WithoutSignUpLink: Story = {
  args: {
    showSignUpLink: false,
  },
};
