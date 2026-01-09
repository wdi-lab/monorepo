import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useEffect, useState } from 'react';
import * as z from 'zod';
import { getRequest } from '@tanstack/react-start/server';
import { Box, Card, Center, Heading, Spinner, Text, VStack } from '@lib/ui';
import { processSocialCallback } from '~/server/auth';
import { useCognitoContextData } from '~/hooks/useCognitoContextData';

// OAuth callback can have either success params (code, state) or error params
const callbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

type CallbackParams = z.infer<typeof callbackSchema>;

// Server function to extract POST form data from the request
const getFormPostData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CallbackParams | null> => {
    const request = getRequest();

    // Only process if this was a POST request with form data
    if (request.method !== 'POST') {
      return null;
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/x-www-form-urlencoded')) {
      return null;
    }

    try {
      const formData = await request.formData();
      const data: CallbackParams = {
        code: formData.get('code')?.toString(),
        state: formData.get('state')?.toString(),
        error: formData.get('error')?.toString(),
        error_description: formData.get('error_description')?.toString(),
      };
      return callbackSchema.parse(data);
    } catch {
      return null;
    }
  }
);

// Search params schema (for GET requests)
const searchSchema = callbackSchema;

type SearchParams = z.infer<typeof searchSchema>;

/**
 * Check if CallbackParams has any meaningful data
 */
function hasParams(params: CallbackParams): boolean {
  return !!(params.code || params.state || params.error);
}

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
  // Loader runs on server - extracts form POST data if present
  loader: async () => {
    const formData = await getFormPostData();
    return { formData };
  },
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
  const { formData } = Route.useLoaderData();

  // Use form POST data if available, otherwise fall back to query string
  const params: CallbackParams =
    formData && hasParams(formData) ? formData : search;

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isPopup] = useState(() => isPopupWindow());
  const { getEncodedData, isCognitoContextReady } = useCognitoContextData();

  useEffect(() => {
    const completeAuth = async () => {
      // Check for OAuth error from provider
      if (params.error) {
        const error =
          params.error_description ||
          params.error ||
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
      if (!params.code || !params.state) {
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
      // Collect device fingerprint data for Cognito adaptive authentication
      // For social login callback, we don't know the email yet, so pass empty string
      const encodedData = getEncodedData('');

      const result = await processSocialCallback({
        data: {
          code: params.code,
          state: params.state,
          encodedData,
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

    isCognitoContextReady && completeAuth();
  }, [params, isPopup, getEncodedData, isCognitoContextReady]);

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
