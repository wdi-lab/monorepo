import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen';

/**
 * Router Context Type
 *
 * Defines the context available in all routes via beforeLoad and useRouteContext.
 * The queryClient is created fresh per request to prevent auth state leaking
 * between users during SSR.
 */
export interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Create default QueryClient options
 *
 * These options are shared between all QueryClient instances.
 */
function createQueryClientOptions() {
  return {
    defaultOptions: {
      queries: {
        // Don't refetch on window focus by default
        refetchOnWindowFocus: false,
        // Don't retry failed queries by default
        retry: false,
      },
    },
  };
}

export function getRouter() {
  // Create a fresh QueryClient for each router instance
  // On SSR, each request gets a new router = new QueryClient
  // On client, there's typically one router = one QueryClient
  const queryClient = new QueryClient(createQueryClientOptions());

  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
    defaultNotFoundComponent: () => <p>Not found</p>,
    scrollRestoration: true,
    // Provide queryClient via router context to all routes
    context: {
      queryClient,
    },
  });

  // Set up TanStack Query integration for SSR
  // This automatically wraps the router with QueryClientProvider
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
