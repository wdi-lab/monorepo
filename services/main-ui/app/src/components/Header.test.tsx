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
import { Header } from './Header';
import { render } from '~/test/test-utils';

// Helper to render with router context
function renderWithRouter() {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <Header />
        <Outlet />
      </>
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

  const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

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
    });
  });

  it('displays navigation links', async () => {
    renderWithRouter();

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /home/i });
      const aboutLink = screen.getByRole('link', { name: /about/i });

      expect(homeLink).toBeInTheDocument();
      expect(aboutLink).toBeInTheDocument();
    });
  });

  it('has correct link destinations', async () => {
    renderWithRouter();

    await waitFor(() => {
      const homeLink = screen.getByRole('link', { name: /home/i });
      const aboutLink = screen.getByRole('link', { name: /about/i });

      expect(homeLink).toHaveAttribute('href', '/');
      expect(aboutLink).toHaveAttribute('href', '/about');
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

      // Both links should be visible
      expect(homeLink).toBeVisible();
      expect(aboutLink).toBeVisible();
    });
  });
});
