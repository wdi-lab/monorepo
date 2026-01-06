/**
 * LoginModalProvider - Shared login modal context
 *
 * Provides a single LoginModal that can be opened from anywhere in the app:
 * - Header "Login" button
 * - Protected routes requiring authentication
 * - Session expiry requiring re-authentication
 *
 * Usage:
 * 1. Wrap your app with <LoginModalProvider>
 * 2. Use useLoginModal() hook to open/close the modal
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { LoginFormProps } from '@lib/ui';
import { LoginModal } from '~/components/LoginModal';

// ============================================================================
// Types
// ============================================================================

export interface LoginModalOptions {
  /** If true, modal cannot be dismissed without logging in */
  required?: boolean;
  /** Custom heading for the modal */
  heading?: LoginFormProps['heading'];
  /** Redirect path after successful login */
  redirectPath?: string;
  /** Callback when login succeeds */
  onSuccess?: () => void;
  /** Callback when modal is closed without logging in (only if not required) */
  onClose?: () => void;
}

export interface LoginModalContextValue {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Open the login modal with options */
  openLoginModal: (options?: LoginModalOptions) => void;
  /** Close the login modal (only works if not required) */
  closeLoginModal: () => void;
}

// ============================================================================
// Context
// ============================================================================

const LoginModalContext = createContext<LoginModalContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export interface LoginModalProviderProps {
  children: ReactNode;
}

export function LoginModalProvider({ children }: LoginModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<LoginModalOptions>({});

  // Use ref to avoid stale closure issues in callbacks
  // Update ref in effect to avoid "cannot update ref during render" lint error
  const optionsRef = useRef<LoginModalOptions>(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const openLoginModal = useCallback((opts: LoginModalOptions = {}) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    // Only allow closing if not required
    if (!optionsRef.current.required) {
      setIsOpen(false);
      optionsRef.current.onClose?.();
    }
  }, []);

  const handleSuccess = useCallback(() => {
    optionsRef.current.onSuccess?.();
    setIsOpen(false);
    // Reset options after close
    setOptions({});
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    optionsRef.current.onClose?.();
    // Reset options after close
    setOptions({});
  }, []);

  const value = useMemo<LoginModalContextValue>(
    () => ({
      isOpen,
      openLoginModal,
      closeLoginModal,
    }),
    [isOpen, openLoginModal, closeLoginModal]
  );

  return (
    <LoginModalContext.Provider value={value}>
      {children}
      <LoginModal
        open={isOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
        required={options.required}
        heading={options.heading}
        redirectPath={options.redirectPath}
      />
    </LoginModalContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useLoginModal(): LoginModalContextValue {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
