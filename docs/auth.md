# Authentication Architecture

Comprehensive guide to the authentication architecture, design decisions, and implementation patterns used in this monorepo.

## Table of Contents

- [Overview](#overview)
- [Architecture Principles](#architecture-principles)
- [System Design](#system-design)
- [Service Communication](#service-communication)
- [Infrastructure Patterns](#infrastructure-patterns)
- [Security Model](#security-model)
- [Related Documentation](#related-documentation)

## Overview

The authentication system is built on **service encapsulation** and **API-first design** principles. Services communicate through type-safe internal APIs, with implementation details (like Cognito) hidden behind clean service boundaries.

### Key Design Principles

1. **Encapsulation**: Auth service owns and manages all authentication concerns
2. **API-First**: Services interact via type-safe ORPC contracts, not direct resource access
3. **Single Responsibility**: Each service has one clear purpose
4. **Loose Coupling**: Services depend on APIs, not implementation details
5. **Type Safety**: End-to-end type safety from contract to implementation

## Architecture Principles

### Service Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        Auth Service                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Internal Implementation (Cognito, KMS, DynamoDB)   │    │
│  │  - User Pool configuration                          │    │
│  │  - Magic Link signing/verification                  │    │
│  │  - Custom Lambda triggers                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Public Internal API (ORPC)                │    │
│  │  - POST /auth/login                                 │    │
│  │  - POST /auth/verify                                │    │
│  │  - GET /auth/user/{id}                              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ▲
                          │ Type-safe ORPC calls
                          │
┌─────────────────────────────────────────────────────────────┐
│                    Consumer Services                         │
│  (main-ui, mobile-app, etc.)                                │
│                                                              │
│  - Only knows AUTH_INTERNAL_API_URL                         │
│  - Uses @contract/internal-api/auth for type safety         │
│  - No direct Cognito access                                 │
└─────────────────────────────────────────────────────────────┘
```

### Why This Design?

**Before (Tight Coupling):**

```typescript
// Consumer needs to know about Cognito
environment: {
  COGNITO_USER_POOL_ID: userPoolId,
  COGNITO_CLIENT_ID: clientId,
  COGNITO_CLIENT_SECRET: clientSecret, // ❌ Secrets leaked across services
}

// Consumer must implement Cognito SDK calls
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
```

**After (Loose Coupling):**

```typescript
// Consumer only needs API URL
environment: {
  AUTH_INTERNAL_API_URL: authApiUrl, // ✅ Single endpoint
}

// Consumer uses type-safe API client
import { client } from '~/internal-api/auth';
const user = await client.user.get({ id }); // ✅ Type-safe, simple
```

### Benefits

| Aspect              | Benefit                                            |
| ------------------- | -------------------------------------------------- |
| **Security**        | Secrets stay within auth service, not distributed  |
| **Maintainability** | Change Cognito to Auth0? Only auth service changes |
| **Testability**     | Mock API instead of mocking AWS SDK                |
| **Type Safety**     | Contracts ensure API compatibility                 |
| **Independence**    | Services deploy independently                      |

## System Design

### Component Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Internal API Gateway (HTTP API v2)                │      │
│  │  - IAM authorization                               │      │
│  │  - Service-to-service communication                │      │
│  └────────────────────────────────────────────────────┘      │
│                                                               │
│  Published via SSM:                                          │
│  - shared-infra/internal-api-id                             │
│  - shared-infra/internal-api-url                            │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ Adds routes
┌──────────────────────────────────────────────────────────────┐
│                      Auth Service                             │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Infrastructure (infra/)                           │      │
│  │  ├── UserPool - Cognito configuration              │      │
│  │  ├── CognitoTriggers - Lambda auth flow handlers   │      │
│  │  └── MagicLink - KMS, DynamoDB, SES resources      │      │
│  └────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Lambda Functions (functions/)                     │      │
│  │  ├── internal-api/ - ORPC router implementation    │      │
│  │  └── cognito/ - Custom auth triggers               │      │
│  └────────────────────────────────────────────────────┘      │
│                                                               │
│  Published via SSM:                                          │
│  - auth/internal-api-url (full URL with /auth prefix)       │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ Consumes
┌──────────────────────────────────────────────────────────────┐
│                    Consumer Service (e.g., main-ui)           │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Application (app/)                                │      │
│  │  ├── internal-api/auth.ts - ORPC client            │      │
│  │  └── server/ - Server functions using client       │      │
│  └────────────────────────────────────────────────────┘      │
│                                                               │
│  Reads from SSM:                                             │
│  - auth/internal-api-url                                     │
└──────────────────────────────────────────────────────────────┘
```

### Deployment Flow

1. **shared-infra** deploys first:
   - Creates HTTP API Gateway
   - Writes `internal-api-id` and `internal-api-url` to SSM

2. **auth** deploys second (depends on shared-infra):
   - Reads `internal-api-id` from SSM
   - Adds routes: `ANY /auth/{proxy+}` → Lambda handler
   - Creates Cognito User Pool, KMS keys, DynamoDB tables
   - Writes `auth/internal-api-url` to SSM (full URL: `https://xxx.execute-api.region.amazonaws.com/auth`)

3. **main-ui** deploys last (depends on auth):
   - Reads `auth/internal-api-url` from SSM
   - Passes URL to Nitro SSR server as environment variable
   - Server functions create ORPC client and make type-safe calls

### Dependency Chain

```
shared-infra (no dependencies)
    ↓
auth (depends on @infra/shared-infra)
    ↓
main-ui (depends on @infra/auth)
```

**Declared in `package.json`:**

```json
// services/auth/package.json
{
  "dependencies": {
    "@infra/shared-infra": "workspace:*"
  }
}

// services/main-ui/package.json
{
  "dependencies": {
    "@infra/auth": "workspace:*"
  }
}
```

This ensures Turborepo deploys services in the correct order.

## Service Communication

### Contract-First API Design

The auth service uses **ORPC** (OpenAPI RPC) for type-safe service-to-service communication.

#### 1. Define Contract

```typescript
// packages/contract-internal-api/src/auth.ts
import { oc } from '@orpc/contract';
import * as z from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
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

#### 2. Implement in Auth Service

```typescript
// services/auth/functions/src/internal-api/router.ts
import { implement } from '@orpc/server';
import { contract } from '@contract/internal-api/auth';

const getUser = implement(contract.user.get).handler(async ({ input }) => {
  // Fetch from Cognito
  const user = await getUserFromCognito(input.id);
  return user;
});

export const router = {
  user: {
    get: getUser,
  },
};
```

#### 3. Consume from Main-UI

```typescript
// services/main-ui/app/src/internal-api/auth.ts
import { createInternalApiClient } from '@client/internal-api';
import { contract } from '@contract/internal-api/auth';

export const client = createInternalApiClient({
  contract,
  baseUrl: process.env.AUTH_INTERNAL_API_URL!,
  // AWS Signature V4 signing is enabled by default
  // Credentials are automatically loaded from environment
});

// Usage in server function
import { createServerFn } from '@tanstack/react-start';
import { client } from '~/internal-api/auth';

export const getUserFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await client.user.get({ id: data.id }); // ✅ Type-safe!
    return { user };
  });
```

### IAM Authentication

Internal APIs use **AWS IAM authorization** for secure service-to-service communication:

- Requests are signed using AWS Signature V4
- Only Lambda functions with proper IAM permissions can invoke
- No API keys or tokens to manage
- Fine-grained access control via IAM policies

**The `@client/internal-api` package handles signing automatically:**

```typescript
import { createInternalApiClient } from '@client/internal-api';
import { contract } from '@contract/internal-api/auth';

// Signing is enabled by default
const client = createInternalApiClient({
  contract,
  baseUrl: process.env.AUTH_INTERNAL_API_URL!,
  // Automatically signs requests with AWS Signature V4
  // Uses credentials from environment (Lambda role, EC2 instance profile, or local AWS credentials)
});

// Requests are automatically signed
const user = await client.user.get({ id }); // ✅ Auto-signed!
```

**Features:**

- ✅ **Auto-detects AWS region** from API Gateway URLs
- ✅ **Auto-detects service name** (`execute-api` or `lambda`)
- ✅ **Uses default credential provider chain** (Lambda role, EC2, env vars, ~/.aws)
- ✅ **Type-safe** via ORPC contracts

**For local development:**

```bash
# Use aws-vault to provide credentials
aws-vault exec <profile> -- pnpm dev

# Or export environment variables
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_REGION=us-east-1
pnpm dev
```

**Disable signing for local mocks:**

```typescript
const client = createInternalApiClient({
  contract,
  baseUrl: 'http://localhost:3001',
  awsSignatureV4: false, // Disable signing
});
```

See [Internal API Documentation](./internal-api.md) for details.

## Infrastructure Patterns

### Service Configuration (SSM Parameters)

The auth service uses the `serviceConfig` helper to share its API URL with consumers:

```typescript
// services/auth/infra/Main.ts
import { serviceConfig } from '@lib/sst-helpers';

export function Main(context: StackContext) {
  const { stack } = context;

  // ... create resources ...

  // Publish auth API URL for consumers
  serviceConfig.createParameter(context, {
    service: 'auth',
    key: 'internal-api-url',
    value: internalApi.url + '/auth',
  });
}
```

**SSM Parameter Path:**

```
/service/auth/<stage>/internal-api-url
```

**Consumers read the value:**

```typescript
// services/main-ui/infra/Main.ts
const authInternalApiUrl = serviceConfig.getParameterValue(context, {
  path: 'auth/internal-api-url',
});

// Pass to Nitro SSR server
const mainSite = new NitroSite(stack, 'MainSite', {
  environment: {
    AUTH_INTERNAL_API_URL: authInternalApiUrl,
  },
});
```

### Shared Resources Definition

Available service configs are defined in `packages/sst-helpers/src/serviceConfig.ts`:

```typescript
export const SharedResource = {
  'shared-infra': {
    INTERNAL_API_URL: 'internal-api-url',
    INTERNAL_API_ID: 'internal-api-id',
  },
  auth: {
    INTERNAL_API_URL: 'internal-api-url', // ✅ Only exposes API URL
    // ❌ NOT exposing: USER_POOL_ID, CLIENT_ID, CLIENT_SECRET
  },
} as const satisfies Record<ServiceNameValue, Record<string, string>>;
```

**Why only expose API URL?**

- Cognito credentials are implementation details
- Consumers should not know about Cognito
- Allows auth service to change providers without breaking consumers
- Better security: secrets stay within auth service

### Modular Constructs

The auth service organizes infrastructure using custom CDK constructs:

```
services/auth/infra/
├── Main.ts                    # Entry point - composes all resources
└── cognito/
    ├── UserPool.ts           # Cognito User Pool configuration
    ├── CognitoTriggers.ts    # Lambda triggers for custom auth flow
    └── MagicLink.ts          # Magic Link specific resources (KMS, DynamoDB, SES)
```

**Benefits:**

- Clear separation of concerns
- Reusable components
- Easier testing
- Modular composition

See [IAC Patterns Documentation](./iac-patterns.md) for details.

## Security Model

### Defense in Depth

| Layer              | Security Control                                           |
| ------------------ | ---------------------------------------------------------- |
| **Network**        | IAM authorization on API Gateway                           |
| **Transport**      | HTTPS only, TLS 1.2+                                       |
| **Authentication** | AWS Signature V4 request signing                           |
| **Authorization**  | IAM policies limit which services can call which endpoints |
| **Secrets**        | Client secrets, KMS keys, etc. stay within auth service    |
| **Data**           | No sensitive data in ORPC error responses                  |

### Secret Management

**What stays in auth service:**

- Cognito User Pool client secret
- KMS private key for magic link signing
- DynamoDB table names
- SES credentials

**What consumers get:**

- Only `AUTH_INTERNAL_API_URL` environment variable
- No direct access to Cognito
- No secrets leaked across service boundaries

### Magic Link Security

The auth service implements secure passwordless authentication using Magic Links:

- **RSA-2048 KMS signing** - Links signed with AWS KMS (RSASSA_PSS_SHA_512)
- **One-time use** - Each link can only be used once (atomic DynamoDB delete)
- **Time-limited** - Links expire after 15 minutes (configurable)
- **Rate limiting** - Minimum 1 minute between requests per user
- **Origin validation** - Only allowed origins can request magic links
- **No user data in link** - Only cryptographic signature in URL

See [Auth Reference Architecture](./auth-reference-architecture.md) for detailed Magic Link flow diagrams.

## Related Documentation

### Core Documentation

- **[Internal API](./internal-api.md)** - ORPC contract-first design, creating clients, IAM authentication
- **[IAC Patterns](./iac-patterns.md)** - Service configuration, deployment order, SSM parameters
- **[Auth Reference Architecture](./auth-reference-architecture.md)** - Detailed Cognito flows, Magic Link implementation, FIDO2/WebAuthn patterns

### Service-Specific

- **[Auth Service README](../services/auth/README.md)** - Quick reference for auth service configuration and usage

### Key Concepts

| Topic                    | Where to Find It                                                            |
| ------------------------ | --------------------------------------------------------------------------- |
| ORPC contract definition | [Internal API](./internal-api.md#contracts)                                 |
| Service dependency chain | [IAC Patterns](./iac-patterns.md#service-dependencies)                      |
| Magic Link flow diagrams | [Auth Reference](./auth-reference-architecture.md#magic-links-architecture) |
| SSM parameter paths      | [IAC Patterns](./iac-patterns.md#cross-service-configuration)               |
| Adding new auth methods  | [Auth README](../services/auth/README.md#adding-new-auth-methods)           |
| Local development setup  | [Internal API](./internal-api.md#local-development-with-aws-credentials)    |

## Summary

The authentication architecture follows these principles:

1. **Service Encapsulation**: Auth service owns all authentication concerns
2. **API-First Design**: Services communicate via type-safe ORPC contracts
3. **Single Source of Truth**: Auth service publishes its API URL via SSM
4. **Loose Coupling**: Consumers depend on API, not Cognito implementation
5. **Security by Default**: IAM authorization, no secrets leaked across services
6. **Type Safety**: End-to-end type safety from contract to implementation

This design enables independent service evolution, better security, and easier testing while maintaining type safety across service boundaries.
