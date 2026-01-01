# Main UI

Frontend application built with TanStack Start, TanStack Router, and Chakra UI v3.

## Overview

The main UI service provides the primary web interface for the application. It uses:

- **TanStack Start** - Full-stack React framework with SSR
- **TanStack Router** - Type-safe routing with file-based routes
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

## Routes

| Route    | Description          |
| -------- | -------------------- |
| `/`      | Home page            |
| `/about` | About page           |
| `/login` | Login page with form |

## Server Functions

Server functions in `app/src/server/` run on the server and can call internal APIs:

```typescript
// app/src/server/auth.ts
import { createServerFn } from '@tanstack/react-start';
import { authClient } from '~/clients/auth';

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const user = await authClient.user.get({ id: 'user-123' });
    return { success: true, user };
  });
```

See [Internal API docs](../../docs/internal-api.md) for more details.

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
