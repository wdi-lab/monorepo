/**
 * SessionExpiredDialog - Dialog shown when user's session has expired
 *
 * Shows "Try Again" button to attempt refresh.
 * If refresh fails, opens the shared LoginModal via LoginModalProvider.
 */

import { useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@lib/ui';
import { useLoginModal } from '~/providers/LoginModalProvider';

export interface SessionExpiredDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to attempt token refresh */
  onRefresh: () => Promise<boolean>;
  /** Callback when login succeeds (after showing LoginModal) */
  onLoginSuccess?: () => void;
}

export function SessionExpiredDialog({
  open,
  onRefresh,
  onLoginSuccess,
}: SessionExpiredDialogProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { openLoginModal } = useLoginModal();

  const handleTryAgain = async () => {
    setIsRefreshing(true);
    try {
      const success = await onRefresh();
      if (!success) {
        // Refresh failed, open the shared login modal
        openLoginModal({
          required: true,
          heading: {
            title: 'Sign In Required',
            subtitle:
              'Your session has expired. Please sign in again to continue.',
          },
          onSuccess: onLoginSuccess,
        });
      }
      // If success, the dialog will be closed by the parent component
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      closeOnInteractOutside={false}
      closeOnEscape={false}
      size="sm"
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Body py={8}>
              <VStack gap={6} textAlign="center">
                <VStack gap={2}>
                  <Heading size="lg">Session Expired</Heading>
                  <Text color="fg.muted">
                    Your session has expired. Click below to reconnect.
                  </Text>
                </VStack>

                <Button
                  colorPalette="blue"
                  size="lg"
                  onClick={handleTryAgain}
                  disabled={isRefreshing}
                  w="full"
                  maxW="200px"
                >
                  {isRefreshing ? (
                    <>
                      <Spinner size="sm" />
                      Reconnecting...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
