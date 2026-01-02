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
│  │  contract = { resource: { get: oc.route(...) } }        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
         implements │                           │ imports
                    ▼                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Shared Internal API                          │
│  ┌────────────────────────┐    ┌────────────────────────┐       │
│  │ Provider Service       │    │ Consumer Service       │       │
│  │ implement(contract)    │    │ createORPCClient()     │       │
│  │   .handler(...)        │    │   .resource.get({...}) │       │
│  └────────────────────────┘    └────────────────────────┘       │
│                                                                  │
│  HTTP API Gateway (v2) with IAM Authorization                    │
└──────────────────────────────────────────────────────────────────┘
```

## Contracts

Contracts define the API shape using `@orpc/contract` with Zod schemas:

```typescript
// packages/contract-internal-api/src/<service>.ts
import { oc } from '@orpc/contract';
import * as z from 'zod';

const ResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const getResource = oc
  .route({ method: 'GET', path: '/resources/{id}' })
  .input(ResourceSchema.pick({ id: true }))
  .output(ResourceSchema);

export const contract = {
  resource: {
    get: getResource,
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
// services/<service>/functions/src/internal-api/router.ts
import { implement } from '@orpc/server';
import { contract } from '@contract/internal-api/<service>';

const getResource = implement(contract.resource.get).handler(
  async ({ input }) => {
    return {
      id: input.id,
      name: 'Example Resource',
    };
  }
);

export const router = {
  resource: {
    get: getResource,
  },
};
```

### Lambda Handler

The handler uses ORPC's OpenAPI handler with Express. The `prefix` must match the API Gateway route prefix:

```typescript
// services/<service>/functions/src/internal-api/handler.ts
import { OpenAPIHandler } from '@orpc/openapi/node';
import { onError } from '@orpc/server';
import { router } from './router.js';

const openApiHandler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error('OpenAPI Error:', error);
    }),
  ],
});

app.use('*', async (req, res, next) => {
  const { matched } = await openApiHandler.handle(req, res, {
    prefix: '/<service>', // Must match API Gateway route prefix
    context: {},
  });

  if (matched) return;
  next();
});
```

## Consuming APIs

### Creating a Client

Use the `@client/internal-api` package to create a type-safe client with automatic AWS Signature V4 signing:

```typescript
// services/<consumer>/app/src/internal-api/<provider>.ts
import { createInternalApiClient } from '@client/internal-api';
import { contract } from '@contract/internal-api/<provider>';

export const client = createInternalApiClient({
  contract,
  baseUrl: process.env.INTERNAL_API_URL!,
  // AWS Signature V4 signing is enabled by default
  // Automatically detects region and service from URL
  // Uses default AWS credential provider chain
});
```

**Features:**

- ✅ Automatic AWS Signature V4 request signing
- ✅ Auto-detects region from API Gateway URLs (`*.execute-api.{region}.amazonaws.com`)
- ✅ Auto-detects service name (`execute-api` or `lambda`)
- ✅ Uses default credential provider chain (Lambda role, EC2, env vars, ~/.aws)
- ✅ Full type safety via ORPC contracts

**Custom options:**

```typescript
import { createInternalApiClient } from '@client/internal-api';

// Custom headers
const client = createInternalApiClient({
  contract,
  baseUrl: process.env.INTERNAL_API_URL!,
  headers: {
    'X-Custom-Header': 'value',
  },
});

// Disable signing for local development
const localClient = createInternalApiClient({
  contract,
  baseUrl: 'http://localhost:3001',
  awsSignatureV4: false,
});

// Custom AWS signing options
const customClient = createInternalApiClient({
  contract,
  baseUrl: process.env.INTERNAL_API_URL!,
  awsSignatureV4: {
    region: 'us-west-2',
    service: 'execute-api',
    credentials: {
      accessKeyId: '...',
      secretAccessKey: '...',
    },
  },
});
```

### Using Client in TanStack Start Server Functions

```typescript
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { client } from '~/internal-api/<provider>';

export const fetchResourceFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const resource = await client.resource.get({ id: data.id });
    return { resource };
  });
```

Key points:

- Server functions run on the server, so they can safely call internal APIs
- Input validation uses Zod via `.inputValidator()`
- Full type safety from contract to response

### Calling Server Functions from Components

```typescript
import { fetchResourceFn } from '~/server/resource';

function ResourcePage({ id }: { id: string }) {
  const handleFetch = async () => {
    const result = await fetchResourceFn({ data: { id } });
    // Handle result
  };
  // ...
}
```

## Infrastructure

Internal APIs share a single HTTP API Gateway deployed by `shared-infra`. Each service adds routes under a service-specific prefix with **IAM authorization**.

### Shared API Gateway

```
shared-infra (deploys first)
├── Creates HTTP API Gateway (v2)
├── Configures access logging
└── Publishes to SSM:
    ├── shared-infra/internal-api-url
    └── shared-infra/internal-api-id

<service> (deploys after shared-infra)
├── Imports HTTP API via serviceConfig.getParameterValue()
├── Adds routes with IAM authorization
└── Routes: ANY /<service>/{proxy+} → Lambda handler
```

### Adding Routes

Services import the shared HTTP API and add routes:

```typescript
// services/<service>/infra/Main.ts
import { Api, StackContext } from 'sst/constructs';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { serviceConfig } from '@lib/sst-helpers';

export function Main(context: StackContext) {
  const { stack } = context;

  const internalApiId = serviceConfig.getParameterValue(context, {
    path: 'shared-infra/internal-api-id',
  });

  const importedHttpApi = HttpApi.fromHttpApiAttributes(
    stack,
    'imported-internal-api',
    { httpApiId: internalApiId }
  );

  new Api(stack, 'internal-api-routes', {
    cdk: { httpApi: importedHttpApi },
    defaults: { authorizer: 'iam' },
    routes: {
      'ANY /<service>/{proxy+}': {
        function: {
          handler: 'functions/src/internal-api/handler.handler',
          runtime: 'nodejs22.x',
        },
      },
    },
  });
}
```

### Route Prefix Convention

Each service uses its name as a route prefix to avoid conflicts:

| Service | Route Prefix | Example Endpoint    |
| ------- | ------------ | ------------------- |
| auth    | `/auth`      | `/auth/users/{id}`  |
| billing | `/billing`   | `/billing/invoices` |
| notify  | `/notify`    | `/notify/send`      |

### IAM Authentication

Internal API routes use AWS IAM authorization for service-to-service authentication:

- **Security**: Only AWS resources with proper IAM permissions can invoke APIs
- **No tokens**: Requests are signed with AWS Signature V4 automatically
- **Fine-grained access**: Control access via IAM policies

**Granting access to a consumer:**

```typescript
// In consumer service infrastructure
myFunction.attachPermissions([
  new PolicyStatement({
    actions: ['execute-api:Invoke'],
    resources: [
      `arn:aws:execute-api:${stack.region}:${stack.account}:${internalApiId}/*`,
    ],
  }),
]);
```

**Signing requests (non-Lambda consumers):**

```typescript
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

const signer = new SignatureV4({
  service: 'execute-api',
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
  sha256: Sha256,
});
```

### Cross-Service Discovery

The `shared-infra` service publishes API configuration to SSM:

- `shared-infra/internal-api-url` - API Gateway endpoint URL
- `shared-infra/internal-api-id` - API Gateway ID (for importing)

See `docs/iac-patterns.md` for details on cross-service configuration.

### Deployment Order

Services must declare dependencies on `shared-infra` in their `package.json`:

```json
{
  "name": "@infra/my-service",
  "dependencies": {
    "@infra/shared-infra": "workspace:*"
  }
}
```

This ensures Turborepo deploys `shared-infra` (which creates the API Gateway) before services that add routes to it.

**How it works:**

1. Service declares `"@infra/shared-infra": "workspace:*"` in dependencies
2. Turborepo sees this and deploys `shared-infra` first
3. `shared-infra` creates API Gateway and writes ID/URL to SSM
4. Consumer service deploys and reads SSM parameters via `serviceConfig`
5. CloudFormation resolves SSM values at deploy time

**Validation:** The `serviceConfig.getParameterValue()` function validates this dependency exists and throws an error if missing. See `docs/iac-patterns.md` for details.

## Testing

Test procedures directly using `@orpc/server`'s `call` utility:

```typescript
import { describe, it, expect } from 'vitest';
import { call } from '@orpc/server';
import { router } from './router.js';

describe('resource.get', () => {
  it('should return resource', async () => {
    const result = await call(router.resource.get, { id: 'test-123' });

    expect(result).toMatchObject({
      id: 'test-123',
      name: expect.any(String),
    });
  });
});
```

### Mocking for Tests

```typescript
import { implement } from '@orpc/server';

const mockGetResource = implement(contract.resource.get).handler(() => ({
  id: 'mock-id',
  name: 'Mock Resource',
}));
```

## Error Handling

Use `ORPCError` for structured error responses:

```typescript
import { ORPCError } from '@orpc/server';

const getResource = implement(contract.resource.get).handler(
  async ({ input }) => {
    const resource = await findResource(input.id);
    if (!resource) {
      throw new ORPCError('NOT_FOUND', { message: 'Resource not found' });
    }
    return resource;
  }
);
```

### Type-Safe Errors

```typescript
const base = os.errors({
  NOT_FOUND: { message: 'Resource not found' },
  UNAUTHORIZED: {},
});

const getResource = base.handler(async ({ input, errors }) => {
  const resource = await findResource(input.id);
  if (!resource) {
    throw errors.NOT_FOUND();
  }
  return resource;
});
```

> **Warning**: Never include sensitive data in `ORPCError.data` as it is sent to the client.

## Best Practices

### Monorepo Structure

```
packages/
├─ contract-internal-api/  # Define contracts with @orpc/contract
services/
├─ <provider>/             # Implement contracts with @orpc/server
├─ <consumer>/             # Consume via @orpc/client
│   └─ app/src/
│       ├─ internal-api/   # ORPC clients
│       └─ server/         # Server functions
```

### Key Principles

- **Contracts in packages**: Enable `composite: true` in `tsconfig.json`
- **Services reference contracts**: Add `references` to contract packages
- **Use workspace packages**: Prefer `workspace:*` over relative imports
- **Server functions for API calls**: Call internal APIs from server functions

### Error Handling Guidelines

1. **Always throw Error instances** - Never throw literals
2. **Use specific error codes** - `NOT_FOUND`, `UNAUTHORIZED`, `BAD_REQUEST`, etc.
3. **No sensitive data in errors** - Error data is sent to clients

## Development Commands

```bash
# Run tests
cd services/<service>/functions && pnpm test

# Type check
cd services/<service> && pnpm type-check

# Deploy
cd services/<service> && pnpm run deploy -- --stage dev
```

### Local Development with AWS Credentials

When running services locally that consume internal APIs, you need AWS credentials for request signing. The `@client/internal-api` package automatically handles AWS Signature V4 authentication.

**Using aws-vault (recommended):**

```bash
# Start dev server with credentials
cd services/main-ui/app
aws-vault exec <profile> -- pnpm dev
```

**Using environment variables:**

```bash
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=us-east-1
pnpm dev
```

**What happens automatically:**

The `@client/internal-api` package:

1. ✅ Detects region from API Gateway URLs (`*.execute-api.{region}.amazonaws.com`)
2. ✅ Detects region from Lambda Function URLs (`*.lambda-url.{region}.on.aws`)
3. ✅ Detects service name (`execute-api` or `lambda`) for correct signing
4. ✅ Uses the default AWS credential provider chain (Lambda role → EC2 instance profile → env vars → `~/.aws/credentials`)
5. ✅ Signs all requests with AWS Signature V4

**No configuration needed** - it just works!

**Disabling signing (for local mocks):**

```typescript
import { createInternalApiClient } from '@client/internal-api';

const client = createInternalApiClient({
  contract,
  baseUrl: 'http://localhost:3001',
  awsSignatureV4: false, // Disable signing for local mock servers
});
```

## Resources

- [ORPC Documentation](https://orpc.dev/docs/getting-started)
- [ORPC Contract-First](https://orpc.dev/docs/contract-first/define-contract)
- [ORPC Best Practices](https://orpc.dev/docs/best-practices/monorepo-setup)
- [ORPC Error Handling](https://orpc.dev/docs/error-handling)
