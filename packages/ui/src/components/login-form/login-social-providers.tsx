import { Button, Stack } from '../../chakra';
import { LoginDivider } from './login-divider';

export interface SocialProvider {
  id: string;
  label?: string;
  onClick?: () => void;
  show?: boolean;
  icon?: React.ReactNode;
}

export interface LoginSocialProvidersProps {
  providers?: SocialProvider[];
  isLoading?: boolean;
}

export function LoginSocialProviders({
  providers,
  isLoading = false,
}: LoginSocialProvidersProps) {
  if (!providers || providers.length === 0) {
    return null;
  }

  const visibleProviders = providers.filter((p) => p.show !== false);

  if (visibleProviders.length === 0) {
    return null;
  }

  return (
    <>
      <LoginDivider />
      <Stack gap={3}>
        {visibleProviders.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            width="full"
            variant="outline"
            size="lg"
            onClick={provider.onClick}
            disabled={isLoading}
          >
            {provider.icon}
            {provider.label}
          </Button>
        ))}
      </Stack>
    </>
  );
}
