import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import * as z from 'zod';
import { Box, Card, Center, Heading, Spinner, Text, VStack } from '@lib/ui';
import { processSocialCallback } from '~/server/auth';

// OAuth callback can have either success params (code, state) or error params
const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

type SearchParams = z.infer<typeof searchSchema>;

/**
 * Check if the current window is a popup opened by window.open()
 * A popup will have window.opener pointing to the parent window
 */
function isPopupWindow(): boolean {
  try {
    return window.opener !== null && window.opener !== window;
  } catch {
    // Cross-origin access will throw, which means we're likely not in a popup
    return false;
  }
}

/**
 * Send message to parent window and close popup
 * Uses a small delay before closing to ensure the message is delivered
 */
function notifyParentAndClose(
  type: 'social-login-success' | 'social-login-error',
  error?: string
) {
  if (window.opener) {
    window.opener.postMessage({ type, error }, window.location.origin);
    // Small delay to ensure message is delivered before popup closes
    setTimeout(() => {
      window.close();
    }, 100);
  }
}

export const Route = createFileRoute('/auth/social-login')({
  validateSearch: (search): SearchParams => searchSchema.parse(search),
  component: RouteComponent,
  head: () => ({
    meta: [
      { title: 'Signing In...' },
      { name: 'description', content: 'Completing your social sign in' },
    ],
  }),
});

function RouteComponent() {
  const search = Route.useSearch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPopup] = useState(() => isPopupWindow());

  useEffect(() => {
    const completeAuth = async () => {
      // Check for OAuth error from provider
      if (search.error) {
        const error =
          search.error_description ||
          search.error ||
          'Authentication was cancelled or failed';

        if (isPopup) {
          notifyParentAndClose('social-login-error', error);
          return;
        }

        setStatus('error');
        setErrorMessage(error);
        return;
      }

      // Validate required params for success case
      if (!search.code || !search.state) {
        const error = 'Missing required callback parameters';

        if (isPopup) {
          notifyParentAndClose('social-login-error', error);
          return;
        }

        setStatus('error');
        setErrorMessage(error);
        return;
      }

      // Process the callback with auth service
      const result = await processSocialCallback({
        data: {
          code: search.code,
          state: search.state,
        },
      });

      if (result.success) {
        // Clean up URL (remove query params)
        window.history.replaceState(null, '', window.location.pathname);

        if (isPopup) {
          // Notify parent window and close popup
          notifyParentAndClose('social-login-success');
          return;
        }

        setStatus('success');
        // Full page redirect to ensure fresh auth state is loaded
        // Client-side navigation would keep stale AuthProvider state
        window.location.href = result.redirectPath;
      } else {
        console.error('Social login processing failed:', result.error);

        if (isPopup) {
          notifyParentAndClose('social-login-error', result.error);
          return;
        }

        setStatus('error');
        setErrorMessage(result.error);
      }
    };

    completeAuth();
  }, [search, isPopup]);

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
                    Please try signing in again.
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
