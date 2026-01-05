import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Box, Card, Center, Heading, Spinner, Text, VStack } from '@lib/ui';
import { processMagicLink } from '~/server/auth';

export const Route = createFileRoute('/auth/magic-link')({
  // No validateSearch - we parse hash fragment on client side
  component: RouteComponent,
  head: () => ({
    meta: [
      { title: 'Signing In...' },
      { name: 'description', content: 'Completing your sign in' },
    ],
  }),
});

function RouteComponent() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    const completeAuth = async () => {
      // Extract hash from URL - all processing logic is on server
      const hash = window.location.hash.slice(1); // Remove leading '#'
      const redirectUri = `${window.location.origin}/auth/magic-link`;

      const result = await processMagicLink({
        data: { hash, redirectUri },
      });

      if (result.success) {
        // Clean up URL (remove hash fragment)
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('success');

        // Redirect to the original destination
        setTimeout(() => {
          navigate({ to: result.redirectPath });
        }, 1000);
      } else {
        console.error('Magic link processing failed:', result.error);
        setStatus('error');
        setErrorMessage(result.error);
      }
    };

    completeAuth();
  }, [navigate]);

  return (
    <Center minH="100vh" bg="gray.50">
      <Box w="full" maxW="md" p={8}>
        <Card.Root>
          <Card.Body>
            <VStack gap={6} textAlign="center">
              {status === 'loading' && (
                <>
                  <Spinner size="xl" color="blue.500" />
                  <Heading size="lg">Signing you in...</Heading>
                  <Text color="gray.600">Please wait a moment</Text>
                </>
              )}

              {status === 'success' && (
                <>
                  <Heading size="lg">Success!</Heading>
                  <Text color="gray.600">
                    You&apos;ve been signed in. Redirecting...
                  </Text>
                </>
              )}

              {status === 'error' && (
                <>
                  <Heading size="lg" color="red.600">
                    Sign in failed
                  </Heading>
                  <Text color="gray.600">{errorMessage}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Please try requesting a new magic link.
                  </Text>
                </>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </Box>
    </Center>
  );
}
