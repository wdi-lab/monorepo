# Internal API

Type-safe internal APIs for inter-service communication using [ORPC](https://orpc.dev/) with contract-first design.

## Overview

Internal APIs enable type-safe RPC calls between services using:

- **Contracts** (`@contract/internal-api`) - Shared API contracts with Zod schemas
- **Implementations** - Services implement contracts with `@orpc/server`
- **Clients** - Consuming services use type-safe clients via `@orpc/client`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    @contract/internal-api                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  contract = { user: { get: oc.route(...).input(...) } } │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
         implements │                           │ imports
                    ▼                           ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       Auth Service           │    │     Consuming Service        │
│  ┌────────────────────────┐  │    │  ┌────────────────────────┐  │
│  │ implement(contract)    │  │    │  │ createORPCClient()     │  │
│  │   .handler(...)        │  │    │  │   .user.get({ id })    │  │
│  └────────────────────────┘  │    │  └────────────────────────┘  │
└──────────────────────────────┘    └──────────────────────────────┘
```

## Contracts

Contracts define the API shape using `@orpc/contract` with Zod schemas:

```typescript
// packages/contract-internal-api/src/auth.ts
import { oc } from '@orpc/contract';
import * as z from 'zod';

const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
});

export const getUser = oc
  .route({ method: 'GET', path: '/users/{id}' })
  .input(UserSchema.pick({ id: true }))
  .output(UserSchema);

export const contract = {
  user: {
    get: getUser,
  },
};
```

### Adding New Contracts

1. Define schemas and procedures in `packages/contract-internal-api/src/`
2. Export from `packages/contract-internal-api/src/index.ts`
3. Add export path to `package.json` if creating a new file

## Implementing Contracts

Services implement contracts using `@orpc/server`:

```typescript
// services/auth/functions/src/api/router.ts
import { implement } from '@orpc/server';
import { contract } from '@contract/internal-api/auth';

const getUser = implement(contract.user.get).handler(async ({ input }) => {
  // Implementation with full type safety
  return {
    id: input.id,
    email: 'user@example.com',
  };
});

export const router = {
  user: {
    get: getUser,
  },
};
```

### Lambda Handler

The handler uses ORPC's OpenAPI handler with Express:

```typescript
// services/auth/functions/src/api/handler.ts
import { OpenAPIHandler } from '@orpc/openapi/node';
import { router } from './router.js';

const openApiHandler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error('OpenAPI Error:', error);
    }),
  ],
});
```

## Consuming APIs

### Creating a Client

Create a type-safe client using `@orpc/client` with `OpenAPILink`:

```typescript
// services/main-ui/app/src/clients/auth.ts
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { createORPCClient } from '@orpc/client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { contract } from '@contract/internal-api/auth';

const link = new OpenAPILink(contract, {
  url: () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/auth`;
    }
    return process.env.AUTH_API_URL || 'http://localhost:3001';
  },
  headers: () => ({
    'Content-Type': 'application/json',
  }),
});

export const authClient: JsonifiedClient<
  ContractRouterClient<typeof contract>
> = createORPCClient(link);
```

### Using Client in TanStack Start Server Functions

Use the client within TanStack Start server functions to make internal API calls:

```typescript
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { authClient } from '~/clients/auth';

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    // Call auth internal API from server function
    const user = await authClient.user.get({ id: 'user-123' });

    return {
      success: true,
      user,
    };
  });
```

Key points:

- Server functions run on the server, so they can safely call internal APIs
- Input validation uses Zod via `.inputValidator()`
- Full type safety from contract to response

### Calling Server Functions from Components

```typescript
import { loginFn } from '~/server/auth';

function LoginPage() {
  const handleSubmit = async (email: string) => {
    const result = await loginFn({ data: { email } });
    if (result.success) {
      // Handle successful login
    }
  };
  // ...
}
```

## Testing

Test procedures directly using `@orpc/server`'s `call` utility:

```typescript
import { describe, it, expect } from 'vitest';
import { call } from '@orpc/server';
import { router } from './router.js';

describe('user.get', () => {
  it('should return user info', async () => {
    const result = await call(router.user.get, { id: 'test-123' });

    expect(result).toMatchObject({
      id: 'test-123',
      email: expect.any(String),
    });
  });
});
```

### Mocking for Tests

Use `implement` to create mock versions of procedures for testing:

```typescript
import { implement } from '@orpc/server';

// Create a mock implementation for testing
const mockGetUser = implement(contract.user.get).handler(() => ({
  id: 'mock-id',
  email: 'mock@example.com',
}));
```

## OpenAPI Specification

### Auto-generated Spec

The API automatically generates an OpenAPI 3.1.1 specification:

```typescript
import { OpenAPIGenerator } from '@orpc/openapi';
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4';

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
});

const spec = await generator.generate(router, {
  info: { title: 'Auth API', version: '1.0.0' },
});
```

### Scalar API Reference

The handler includes a Scalar API reference UI at the root path for development.

## Infrastructure

Internal APIs are deployed as AWS Lambda functions behind API Gateway:

- **API Gateway**: REST API (v1) managed by SST
- **Lambda**: ESM modules with 30-second timeout
- **CORS**: Enabled for all origins

See `infra/api/InternalApi.ts` in each service for configuration.

## Error Handling

Use `ORPCError` for structured error responses:

```typescript
import { ORPCError } from '@orpc/server';

const getUser = implement(contract.user.get).handler(async ({ input }) => {
  const user = await findUser(input.id);
  if (!user) {
    throw new ORPCError('NOT_FOUND', { message: 'User not found' });
  }
  return user;
});
```

### Type-Safe Errors

For fully type-safe error handling, define errors using `.errors`:

```typescript
const base = os.errors({
  NOT_FOUND: {
    message: 'Resource not found',
  },
  UNAUTHORIZED: {},
});

const getUser = base.handler(async ({ input, errors }) => {
  const user = await findUser(input.id);
  if (!user) {
    throw errors.NOT_FOUND();
  }
  return user;
});
```

> **Warning**: Never include sensitive data in `ORPCError.data` as it is sent to the client.

## Best Practices

### Monorepo Structure

This project follows the recommended ORPC monorepo structure:

```
packages/
├─ contract-internal-api/  # Define contracts with @orpc/contract
services/
├─ auth/                   # Implement contracts with @orpc/server
├─ main-ui/                # Consume via @orpc/client in server functions
│   └─ app/src/
│       ├─ clients/        # ORPC clients for internal APIs
│       └─ server/         # TanStack Start server functions
```

Key principles:

- **Contracts in packages**: Enable `composite: true` in `tsconfig.json`
- **Services reference contracts**: Add `references` to contract packages
- **Use workspace packages**: Prefer `workspace:*` over relative imports
- **Server functions for API calls**: Use TanStack Start server functions to call internal APIs from the frontend

### Dedupe Middleware

When procedures call other procedures or middleware is applied multiple times, use context to prevent redundant execution:

```typescript
const dbProvider = os
  .$context<{ db?: Database }>()
  .middleware(async ({ context, next }) => {
    // Skip if db already exists in context
    const db = context.db ?? (await connectDb());
    return next({ context: { db } });
  });
```

### Error Handling Guidelines

1. **Always throw Error instances** - Never throw literals:

   ```typescript
   // Good
   throw new ORPCError('NOT_FOUND', { message: 'User not found' });

   // Bad
   throw 'User not found';
   ```

2. **Use specific error codes** - ORPC provides standard codes like `NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`

3. **No sensitive data in errors** - Error data is sent to clients

### TypeScript Configuration

For proper type inference across packages, ensure:

1. Contract packages have `composite: true` in `tsconfig.json`
2. Consumer packages reference contract packages:
   ```json
   {
     "references": [{ "path": "../packages/contract-internal-api" }]
   }
   ```

## Development Commands

```bash
# Run tests
cd services/auth/functions
pnpm test

# Type check
cd services/auth
pnpm type-check

# Deploy
cd services/auth
pnpm run deploy -- --stage dev
```

## Resources

- [ORPC Documentation](https://orpc.dev/docs/getting-started)
- [ORPC Contract-First](https://orpc.dev/docs/contract-first/define-contract)
- [ORPC Best Practices](https://orpc.dev/docs/best-practices/monorepo-setup)
- [ORPC Error Handling](https://orpc.dev/docs/error-handling)
- [ORPC Testing & Mocking](https://orpc.dev/docs/advanced/testing-mocking)
