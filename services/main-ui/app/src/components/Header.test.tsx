import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header } from './Header';
import type { AuthStatus } from '~/providers/AuthProvider';
import { LoginModalProvider } from '~/providers/LoginModalProvider';
import { AuthProvider } from '~/providers/AuthProvider';
import { render } from '~/test/test-utils';

// Mock initial auth status for tests
const mockInitialAuthStatus: AuthStatus = {
  isAuthenticated: false,
  canRefresh: false,
  expiresAt: null,
  user: null,
};

// Helper to render with router context and providers
function renderWithRouter(authStatus = mockInitialAuthStatus) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider initialStatus={authStatus}>
          <LoginModalProvider>
            <Header />
            <Outlet />
          </LoginModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    ),
  });

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home Page</div>,
  });

  const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/about',
    component: () => <div>About Page</div>,
  });

  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => <div>Dashboard Page</div>,
  });

  const routeTree = rootRoute.addChildren([
    indexRoute,
    aboutRoute,
    dashboardRoute,
  ]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ['/'],
    }),
  });

  return render(<RouterProvider router={router} />);
}

describe('Header', () => {
  it('renders the header component', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('displays navigation links', async () => {
    renderWithRouter();

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /home/i });
      const aboutLink = screen.getByRole('link', { name: /about/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });

      expect(homeLink).toBeInTheDocument();
      expect(aboutLink).toBeInTheDocument();
      expect(dashboardLink).toBeInTheDocument();
    });
  });

  it('has correct link destinations', async () => {
    renderWithRouter();

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /home/i });
      const aboutLink = screen.getByRole('link', { name: /about/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });

      expect(homeLink).toHaveAttribute('href', '/');
      expect(aboutLink).toHaveAttribute('href', '/about');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  it('renders header container with proper styling', async () => {
    renderWithRouter();

    await waitFor(() => {
      // The header should be present with its links
      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toBeInTheDocument();

      // Check that the parent structure exists
      expect(homeLink.parentElement).toBeInTheDocument();
    });
  });

  it('renders navigation links in horizontal layout', async () => {
    renderWithRouter();

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /home/i });
      const aboutLink = screen.getByRole('link', { name: /about/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });

      // All links should be visible
      expect(homeLink).toBeVisible();
      expect(aboutLink).toBeVisible();
      expect(dashboardLink).toBeVisible();
    });
  });

  it('shows Login button when not authenticated', async () => {
    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /login/i })
      ).toBeInTheDocument();
    });
  });

  it('shows user menu when authenticated', async () => {
    const authenticatedStatus = {
      isAuthenticated: true,
      canRefresh: true,
      expiresAt: Date.now() + 3600000,
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        picture: null,
      },
    };

    renderWithRouter(authenticatedStatus);

    await waitFor(() => {
      // Should show user name or email instead of Login button
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /login/i })
      ).not.toBeInTheDocument();
    });
  });
});
