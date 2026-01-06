import { Avatar, Box, Button, Flex, HStack, Menu, Portal, Text } from '@lib/ui';
import { Link } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { CustomLink } from './CustomLink';
import { useLoginModal } from '~/providers/LoginModalProvider';
import { useAuth } from '~/providers/AuthProvider';
import { getAuthStatus, logout } from '~/server/auth';

export function Header() {
  const { openLoginModal, closeLoginModal } = useLoginModal();
  const { user, isAuthenticated, onLoginSuccess, onLogout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLoginSuccess = useCallback(async () => {
    const status = await getAuthStatus();
    if (status.isAuthenticated) {
      // onLoginSuccess updates the query cache (single source of truth)
      onLoginSuccess(status);
      closeLoginModal();
    }
  }, [onLoginSuccess, closeLoginModal]);

  const handleLogin = useCallback(() => {
    openLoginModal({ onSuccess: handleLoginSuccess });
  }, [openLoginModal, handleLoginSuccess]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // onLogout invalidates the query cache (single source of truth)
      onLogout();
      // Full page redirect - no need to update React state (would cause flicker)
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <Box
      as="header"
      bg="blue.500"
      color="white"
      px={4}
      borderBottom="1px solid"
      borderColor="blue.600"
    >
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <HStack as="nav" gap={4} aria-label="Main navigation">
          <CustomLink to="/">Home</CustomLink>
          <CustomLink to="/about">About</CustomLink>
          <CustomLink to="/dashboard">Dashboard</CustomLink>
        </HStack>

        {isAuthenticated ? (
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button variant="ghost" size="sm" px={2}>
                <HStack gap={2}>
                  <Avatar.Root size="xs">
                    {user?.picture && <Avatar.Image src={user.picture} />}
                    <Avatar.Fallback>
                      {user?.name?.[0] ?? user?.email?.[0] ?? '?'}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <Text display={{ base: 'none', md: 'block' }}>
                    {user?.name ?? user?.email ?? 'User'}
                  </Text>
                </HStack>
              </Button>
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content>
                  <Menu.Item value="dashboard" asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value="logout"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        ) : (
          <Button variant="subtle" onClick={handleLogin} size="sm">
            Login
          </Button>
        )}
      </Flex>
    </Box>
  );
}
