import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginForm } from './login-form';
import { Box } from '../../chakra';

import { FaGoogle, FaGithub, FaMicrosoft } from 'react-icons/fa';

const meta = {
  title: 'Components/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
    onForgotPassword: { action: 'forgot-password' },
    onSignUp: { action: 'sign-up' },
    heading: {
      control: 'object',
    },
    emailLabel: {
      control: 'text',
    },
    emailPlaceholder: {
      control: 'text',
    },
    passwordLabel: {
      control: 'text',
    },
    submitButtonText: {
      control: 'text',
    },
    continueButtonText: {
      control: 'text',
    },
    isLoading: {
      control: 'boolean',
    },
    showRememberMe: {
      control: 'boolean',
    },
    showForgotPassword: {
      control: 'boolean',
    },
    socialProviders: {
      control: false,
    },
    showSignUpLink: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    socialProviders: [
      {
        id: 'google',
        label: 'Sign in with Google',
        icon: <FaGoogle />,
        onClick: () => alert('Signing in with Google'),
        show: true,
      },
    ],
  },
};

export const WithMultipleProviders: Story = {
  args: {
    socialProviders: [
      {
        id: 'google',
        label: 'Sign in with Google',
        icon: <FaGoogle />,
        onClick: () => alert('Signing in with Google'),
        show: true,
      },
      {
        id: 'github',
        label: 'Sign in with GitHub',
        icon: <FaGithub />,
        onClick: () => alert('Signing in with GitHub'),
        show: true,
      },
      {
        id: 'microsoft',
        label: 'Sign in with Microsoft',
        icon: <FaMicrosoft />,
        onClick: () => alert('Signing in with Microsoft'),
        show: false,
      },
    ],
  },
};

export const WithLogo: Story = {
  args: {
    heading: {
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
      title: 'Welcome back',
      subtitle: 'Sign in to your account to continue',
    },
  },
};

export const CustomContent: Story = {
  args: {
    heading: {
      title: 'Sign In',
      subtitle: 'Access your account',
    },
    submitButtonText: 'Continue',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const WithErrors: Story = {
  args: {
    passwordError: 'Password must be at least 8 characters',
    defaultEmail: 'user@example.com',
  },
};

export const MinimalWithoutOptionalFeatures: Story = {
  args: {
    heading: {
      title: 'Welcome back',
    },
    showRememberMe: false,
    showForgotPassword: false,
    showSignUpLink: false,
  },
};

export const WithoutTitle: Story = {
  args: {
    heading: {},
  },
};

export const WithoutSignUpLink: Story = {
  args: {
    showSignUpLink: false,
  },
};

export const WithEmailValidationError: Story = {
  args: {
    onValidateEmail: (email: string) => {
      if (!email || email.trim() === '') {
        return 'Email address is required';
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        return 'Please enter a valid email address';
      }
      return undefined;
    },
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          Try submitting with:
          <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
            <li>Empty email</li>
            <li>Invalid format: &quot;notanemail&quot;</li>
            <li>Valid email: &quot;user@example.com&quot;</li>
          </ul>
        </Box>
      </Box>
    </Box>
  ),
};

export const WithDefaultEmail: Story = {
  args: {
    defaultEmail: 'user@example.com',
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          This story demonstrates skipping step 1 by providing a defaultEmail
          prop. The form starts directly at the password step. Click the edit
          icon to go back and change the email.
        </Box>
      </Box>
    </Box>
  ),
};

export const WithAsyncEmailVerification: Story = {
  args: {
    onEmailVerified: async (_email: string) => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Return available login methods
      return {
        methods: ['password', 'magic-link'],
      };
    },
    onMagicLinkRequest: (_email: string) => {
      alert(`Magic link sent to ${_email}`);
    },
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          This story demonstrates async email verification. After entering an
          email, the form will verify it (simulated 1.5s delay) and show both
          password and magic link options.
        </Box>
      </Box>
    </Box>
  ),
};

export const WithPasswordOnly: Story = {
  args: {
    onEmailVerified: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        methods: ['password'],
      };
    },
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          This story shows password-only authentication after email
          verification.
        </Box>
      </Box>
    </Box>
  ),
};

export const WithMagicLinkOnly: Story = {
  args: {
    onEmailVerified: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        methods: ['magic-link'],
      };
    },
    onMagicLinkRequest: (email: string) => {
      alert(`Magic link sent to ${email}`);
    },
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          This story shows magic link only authentication. Perfect for
          passwordless login flows.
        </Box>
      </Box>
    </Box>
  ),
};

export const WithEmailVerificationError: Story = {
  args: {
    onEmailVerified: async (email: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (email === 'blocked@example.com') {
        return {
          methods: [],
          error: 'This account has been blocked',
        };
      }

      return {
        methods: ['password'],
      };
    },
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          Try entering &quot;blocked@example.com&quot; to see an error from the
          email verification callback.
        </Box>
      </Box>
    </Box>
  ),
};

export const WithPasswordValidation: Story = {
  args: {
    defaultEmail: 'user@example.com',
    onSubmit: (email: string, password: string) => {
      alert(`Login successful!\nEmail: ${email}\nPassword: ${password}`);
    },
  },
  render: (args) => (
    <Box>
      <LoginForm {...args} />
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Box fontSize="sm" color="gray.600">
          This story demonstrates password validation. Try submitting the form
          without entering a password to see the validation error. The error
          will clear when you start typing.
        </Box>
      </Box>
    </Box>
  ),
};
