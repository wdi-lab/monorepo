/**
 * Dashboard - Example protected route
 *
 * This route is protected by the _authenticated layout.
 * Users must be logged in to access it.
 *
 * User info is accessed via useAuth() hook from the shared AuthProvider,
 * avoiding duplicate auth status fetches.
 */

import { createFileRoute } from '@tanstack/react-router';
import {
  Button,
  Card,
  Container,
  HStack,
  Heading,
  Text,
  VStack,
} from '@lib/ui';
import { useState } from 'react';
import { logout } from '~/server/auth';
import { Header } from '~/components/Header';
import { useAuth } from '~/providers/AuthProvider';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: 'Dashboard' },
      { name: 'description', content: 'Your personal dashboard' },
    ],
  }),
});

function DashboardPage() {
  const { user, onLogout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Remove auth cache so next page load fetches fresh status
      onLogout();
      // Full page redirect - no need to update React state (would cause flicker)
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <Header />
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <HStack justify="space-between" align="center">
            <Heading size="xl">Dashboard</Heading>
            <Button
              variant="outline"
              colorPalette="red"
              onClick={handleLogout}
              loading={isLoggingOut}
            >
              Sign Out
            </Button>
          </HStack>

          <Card.Root>
            <Card.Header>
              <Heading size="md">Welcome!</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap={4} align="start">
                {user?.email ? (
                  <Text>
                    Signed in as: <strong>{user.email}</strong>
                  </Text>
                ) : user?.name ? (
                  <Text>
                    Signed in as: <strong>{user.name}</strong>
                  </Text>
                ) : (
                  <Text color="fg.muted">User info not available</Text>
                )}
                <Text color="fg.muted">
                  This is a protected page. Your session will automatically
                  refresh in the background. If your session expires, you will
                  be prompted to sign in again.
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Heading size="md">Token Refresh Info</Heading>
            </Card.Header>
            <Card.Body>
              <Text color="fg.muted" fontSize="sm">
                Your access tokens are automatically refreshed 5 minutes before
                they expire. If you leave this tab in the background, the
                refresh timer pauses. When you return, the app checks if your
                session is still valid and refreshes if needed.
              </Text>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    </>
  );
}
