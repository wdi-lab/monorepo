# Main UI

Frontend application built with TanStack Start, TanStack Router, and Chakra UI v3.

## Overview

The main UI service provides the primary web interface for the application. It uses:

- **TanStack Start** - Full-stack React framework with SSR
- **TanStack Router** - Type-safe routing with file-based routes
- **TanStack Query** - Data fetching with SSR integration via `@tanstack/react-router-ssr-query`
- **Chakra UI v3** - Component library via `@lib/ui`
- **Vite** - Build tooling and dev server
- **SST** - Infrastructure deployment via `NitroSite`

## Project Structure

```
services/main-ui/
├── app/                    # TanStack Start application
│   ├── src/
│   │   ├── internal-api/   # ORPC clients for internal APIs
│   │   ├── components/     # React components
│   │   ├── routes/         # File-based routes
│   │   ├── server/         # Server functions
│   │   └── test/           # Test utilities
│   ├── vite.config.ts
│   └── package.json
├── infra/                  # SST infrastructure
│   ├── Main.ts             # NitroSite deployment
│   └── Main.test.ts
├── sst.config.ts
└── package.json
```

## Authentication Architecture

The main-ui service **does NOT have direct access to Cognito**. All authentication operations go through the auth service's internal API:

```
┌─────────────┐
│  main-ui    │
│  (browser)  │
└──────┬──────┘
       │
       │ 1. User submits email
       ▼
┌─────────────────────┐
│  main-ui            │
│  (server function)  │
└──────┬──────────────┘
       │
       │ 2. IAM-signed request
       ▼
┌─────────────────────┐
│  auth service       │
│  (internal API)     │
└──────┬──────────────┘
       │
       │ 3. Cognito operations
       ▼
┌─────────────────────┐
│  AWS Cognito        │
└─────────────────────┘
```

**Key points:**

- main-ui only calls the auth service's internal API endpoints
- Auth service acts as a proxy and handles all Cognito interactions
- Server functions in main-ui sign requests with IAM credentials
- No Cognito credentials or SDKs in main-ui

## Routes

| Route                | Description                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| `/`                  | Home page                                                                     |
| `/about`             | About page                                                                    |
| `/login`             | Login page with magic link form (accepts `?redirect=` param)                  |
| `/dashboard`         | Protected dashboard (requires authentication)                                 |
| `/auth/magic-link`   | Magic link callback handler (server processes hash, stores tokens in session) |
| `/auth/social-login` | Social login callback handler (OAuth code exchange)                           |

### Magic Link Flow

The magic link authentication flow uses **server-side cookie management**:

1. **Login route** (`/login`):
   - User submits email
   - Server function calls auth API to initiate magic link
   - **Server sets HttpOnly cookies** for session and redirect path
   - User redirected to `/login/check-email`

2. **Magic link route** (`/auth/magic-link`):
   - User clicks magic link in email
   - Client extracts hash fragment and sends to server
   - Server function `processMagicLink` handles all logic:
     - Parses hash, extracts email for cross-browser fallback
     - Reads session from **HttpOnly cookie**
     - Completes authentication with auth API
     - Stores tokens in **session** (not localStorage)
   - Client redirects user to original destination

**Cross-browser support**: If magic link is opened in a different browser (no cookie), the client detects the error and initiates a new auth session.

See [Magic Link Testing Reference](../../docs/magic-link-testing-reference.md) for detailed flow diagrams.

## Server Functions

Server functions in `app/src/server/` run on the server and can call internal APIs. They also handle **secure cookie management** for authentication.

### Authentication Server Functions

```typescript
// app/src/server/auth.ts
import { createServerFn } from '@tanstack/react-start';
import { setCookie } from 'vinxi/http';
import { authClient } from '~/internal-api/auth';

export const initiateMagicLink = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const response = await authClient.magicLink.initiate({
      email: data.email,
      redirectUri: data.redirectUri,
    });

    // Set HttpOnly, Secure cookies for session management
    setCookie('magicLinkSession', response.session, {
      httpOnly: true, // Prevents XSS - inaccessible to JavaScript
      secure: true, // HTTPS only
      sameSite: 'strict', // CSRF protection
      path: '/',
      maxAge: 900, // 15 minutes
    });

    return { success: true };
  });
```

### Cookie Security

**All authentication cookies are managed server-side** with the following security attributes:

| Attribute  | Value      | Benefit                                                      |
| ---------- | ---------- | ------------------------------------------------------------ |
| `httpOnly` | `true`     | Prevents XSS attacks - cookies inaccessible to JavaScript    |
| `secure`   | `true`     | HTTPS-only transmission - prevents man-in-the-middle attacks |
| `sameSite` | `'strict'` | CSRF protection - cookies only sent to same-site requests    |
| `maxAge`   | `900`      | 15-minute expiry - time-limited session tokens               |

**Why server-side cookie management?**

- ✅ Session tokens never exposed to client-side JavaScript
- ✅ HttpOnly flag prevents XSS attacks from stealing tokens
- ✅ Secure flag ensures cookies only sent over HTTPS
- ✅ SameSite=Strict prevents CSRF attacks
- ✅ SSR compatible - cookies work during server rendering

See [Internal API docs](../../docs/internal-api.md) and [Auth docs](../../docs/auth.md) for more details.

## Session Management & Token Refresh

The application uses TanStack Query as the single source of truth for authentication state, with automatic token refresh handled via `refetchInterval`.

### TanStack Query SSR Integration

The app uses `@tanstack/react-router-ssr-query` to properly handle QueryClient lifecycle:

```typescript
// router.tsx - Fresh QueryClient per request
export function getRouter() {
  const queryClient = new QueryClient(createQueryClientOptions());

  const router = createRouter({
    routeTree,
    context: { queryClient },
  });

  // Auto-wraps with QueryClientProvider
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}
```

**Why this matters:**

- **SSR Safety**: Each server request gets a fresh QueryClient, preventing auth state from leaking between users
- **Automatic Provider**: The integration wraps the router with `QueryClientProvider` automatically
- **Context Access**: Routes access `queryClient` via `context.queryClient` in `beforeLoad`

### AuthProvider

The `AuthProvider` uses TanStack Query's `useQuery` with `refetchInterval` for automatic token refresh:

```typescript
// Root route fetches auth status once via queryClient
export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const auth = await fetchAuthStatus(context.queryClient);
    return { auth };
  },
});

// AuthProvider uses useQuery as single source of truth
const { data: authStatus } = useQuery({
  queryKey: AUTH_STATUS_QUERY_KEY,
  queryFn: authStatusQueryFn,
  initialData: initialStatus,
  refetchInterval: (query) => calculateRefetchInterval(query.state.data),
  refetchIntervalInBackground: false,
});
```

### Using Auth State

Access auth state anywhere using the `useAuth()` hook:

```typescript
import { useAuth } from '~/providers/AuthProvider';

function MyComponent() {
  const {
    user,           // User info (id, email, name, picture)
    isAuthenticated,// Whether access token is valid
    canRefresh,     // Whether refresh token exists
    sessionState,   // 'active' | 'expired' | 'login'
    isRefreshing,   // Whether refresh is in progress
    refresh,        // Manual refresh trigger
    onLoginSuccess, // Update state after login
    onLogout,       // Clear state after logout
  } = useAuth();

  return <div>Welcome, {user?.name}</div>;
}
```

### Automatic Token Refresh

TanStack Query's `refetchInterval` handles automatic token refresh:

- **Proactive**: Refreshes 5 minutes before expiry (configurable)
- **Jittered**: Random delay (±10%) prevents thundering herd when multiple users have similar expiry times
- **Visibility-aware**: `refetchIntervalInBackground: false` pauses refresh when tab is hidden
- **Failure handling**: Falls back to login on refresh failure

```typescript
// calculateRefetchInterval adds jitter to prevent thundering herd
export function calculateRefetchInterval(
  data: AuthStatus | undefined
): number | false {
  if (!data?.expiresAt || !data.canRefresh || !data.isAuthenticated) {
    return false;
  }

  const msUntilExpiry = data.expiresAt - Date.now();
  const baseInterval = Math.max(msUntilExpiry - REFRESH_BEFORE_MS, 0);

  // Add ±10% jitter
  const jitter = baseInterval * 0.1 * (Math.random() * 2 - 1);
  return Math.max(baseInterval + jitter, MIN_INTERVAL_MS);
}
```

### Protected Routes

The `_authenticated` layout protects child routes:

| Scenario                            | Behavior                                    |
| ----------------------------------- | ------------------------------------------- |
| Direct navigation (unauthenticated) | Redirect to `/login?redirect=/path`         |
| Session expires while on page       | Show `SessionExpiredDialog`                 |
| Refresh fails                       | Show `LoginModal` (content already visible) |

### Login Integration

**From Header** (triggers modal):

```typescript
const { openLoginModal } = useLoginModal();
const { onLoginSuccess } = useAuth();

const handleLoginSuccess = async () => {
  const status = await getAuthStatus();
  onLoginSuccess(status); // Updates query cache via setQueryData
};

openLoginModal({ onSuccess: handleLoginSuccess });
```

**From /login page** (redirects):

```typescript
// Callback uses full page redirect to load fresh auth state
window.location.href = result.redirectPath;
```

**Logout**:

```typescript
const { onLogout } = useAuth();

const handleLogout = async () => {
  await logout();
  onLogout(); // Removes query cache via removeQueries
  window.location.href = '/';
};
```

See [Auth docs - Client-Side Session Management](../../docs/auth.md#client-side-session-management) for detailed architecture.

## Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start dev server
cd services/main-ui/app
pnpm dev

# Or from repo root
pnpm dev --filter @app/main-ui
```

The dev server runs at `http://localhost:3000`.

### Running with AWS Credentials

Server functions that call internal APIs require AWS credentials for request signing. Use `aws-vault` or another credential provider:

```bash
# Using aws-vault
cd services/main-ui/app
aws-vault exec <profile> -- pnpm dev

# Or with AWS environment variables
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx AWS_REGION=us-west-2 pnpm dev
```

The internal API client automatically:

- Detects region from API Gateway/Lambda Function URLs
- Uses the default AWS credential provider chain
- Signs requests with AWS Signature V4

## Commands

From `services/main-ui/app`:

| Command           | Description                |
| ----------------- | -------------------------- |
| `pnpm dev`        | Start development server   |
| `pnpm build:app`  | Build for production       |
| `pnpm preview`    | Preview production build   |
| `pnpm start`      | Run production server      |
| `pnpm lint`       | Run ESLint                 |
| `pnpm type-check` | Type check with TypeScript |
| `pnpm test`       | Run tests in watch mode    |
| `pnpm test:run`   | Run tests once             |

## Deployment

Deploy using SST:

```bash
cd services/main-ui
pnpm run deploy -- --stage <stage>
```

The application is deployed as a `NitroSite` to AWS with:

- CloudFront distribution
- Lambda@Edge for SSR
- S3 for static assets

## Testing

Tests use Vitest with React Testing Library:

```bash
cd services/main-ui/app

# Run all tests
pnpm test:run

# Run specific test file
pnpm vitest run src/components/Header.test.tsx

# Watch mode
pnpm test
```

Test utilities in `app/src/test/test-utils.tsx` provide a custom render function that wraps components with required providers.

## Infrastructure

The infrastructure is defined in `infra/Main.ts` using SST constructs:

```typescript
import { NitroSite } from '@lib/sst-constructs';

export function Main(context: StackContext) {
  const mainSite = new NitroSite(stack, 'MainSite', {
    path: './app',
    buildCommand: 'pnpm build:app',
  });
}
```

Infrastructure tests are in `infra/Main.test.ts`.

## Dependencies

Key dependencies:

- `@lib/ui` - Shared Chakra UI components
- `@contract/internal-api` - API contracts for type-safe clients
- `@orpc/client` - ORPC client for internal API calls
- `@tanstack/react-start` - Full-stack React framework
- `@tanstack/react-router` - Type-safe routing
- `@tanstack/react-query` - Data fetching and caching
- `@tanstack/react-router-ssr-query` - SSR integration for Query + Router
