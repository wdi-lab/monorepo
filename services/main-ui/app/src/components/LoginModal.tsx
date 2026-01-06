/**
 * LoginModal - Reusable login modal component
 *
 * Can be used in two modes:
 * - Dismissable: For header "Login" button (can be closed)
 * - Non-dismissable: For session expiry (cannot be closed, must login)
 *
 * Uses popup window for social login when in modal mode.
 */

import { CloseButton, Dialog, Portal } from '@lib/ui';
import { LoginFormContainer } from './LoginFormContainer';
import type { LoginFormContainerProps } from './LoginFormContainer';

export interface LoginModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when login succeeds */
  onSuccess?: () => void;
  /**
   * If true, the modal cannot be dismissed (for session expiry).
   * If false, the modal can be closed via close button or clicking outside.
   */
  required?: boolean;
  /** Redirect path after successful login */
  redirectPath?: string;
  heading?: LoginFormContainerProps['heading'];
}

export function LoginModal({
  open,
  onClose,
  onSuccess,
  required = false,
  heading,
  redirectPath = '/',
}: LoginModalProps) {
  // Note: We only call onSuccess here, not onClose.
  // The parent (LoginModalProvider) handles closing the modal when onSuccess is called.
  // Calling both would cause double state updates.
  const handleSuccess = () => {
    onSuccess?.();
  };

  return (
    <Portal>
      <Dialog.Root
        open={open}
        onOpenChange={(details) => {
          // Only allow closing if not required
          if (!details.open && !required) {
            onClose();
          }
        }}
        closeOnInteractOutside={!required}
        closeOnEscape={!required}
        size="md"
        placement="center"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              {!required && (
                <Dialog.CloseTrigger
                  position="absolute"
                  top="2"
                  insetEnd="2"
                  asChild
                >
                  <CloseButton />
                </Dialog.CloseTrigger>
              )}
            </Dialog.Header>
            <Dialog.Body pb={6}>
              <LoginFormContainer
                redirectPath={redirectPath}
                onSuccess={handleSuccess}
                mode="modal"
                heading={heading}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
}
