# Auth Service

Authentication service using AWS Cognito with custom authentication flows and an internal API for inter-service communication.

> **📚 Comprehensive Guide**: See [Authentication Architecture](../../docs/auth.md) for detailed design principles, service communication patterns, and infrastructure setup.

## Overview

This service provides:

1. **Passwordless authentication** using AWS Cognito with custom Lambda triggers (Magic Link, with support for FIDO2/WebAuthn and SMS OTP planned)
2. **Internal API** built with ORPC for type-safe RPC calls between services

## Internal API

The auth service implements the `@contract/internal-api/auth` contract for type-safe inter-service communication.

See [Internal API Documentation](../../docs/internal-api.md) for details on:

- Contract-first API design
- Creating and consuming clients
- Testing procedures
- OpenAPI specification

### Quick Reference

```typescript
// Consuming the auth API from another service
import { createInternalApiClient } from '@client/internal-api';
import { contract } from '@contract/internal-api/auth';

const client = createInternalApiClient({
  contract,
  baseUrl: process.env.AUTH_INTERNAL_API_URL!,
  // AWS Signature V4 signing enabled by default
});

const user = await client.user.get({ id: 'user-123' });
```

### API Endpoints

| Endpoint                    | Method | Description                            | Status                     |
| --------------------------- | ------ | -------------------------------------- | -------------------------- |
| `/auth/users/{id}`          | GET    | Get user by ID                         | TODO - not yet implemented |
| `/auth/magic-link/initiate` | POST   | Start magic link authentication        | Implemented                |
| `/auth/magic-link/complete` | POST   | Complete authentication, return tokens | Implemented                |

**Request/Response Summary:**

| Endpoint     | Input                    | Output                                                         |
| ------------ | ------------------------ | -------------------------------------------------------------- |
| `initiate`   | `{ email, redirectUri }` | `{ session, message }`                                         |
| `complete`   | `{ session, secret }`    | `{ accessToken, idToken, refreshToken, expiresIn, tokenType }` |
| `users/{id}` | `{ id }`                 | `{ id, email }` (TODO)                                         |

> **Full schemas**: See [`@contract/internal-api/auth`](../../packages/contract-internal-api/src/auth.ts)
>
> **Contract-first design**: See [Internal API Documentation](../../docs/internal-api.md) for how contracts, routers, and clients work.

### Token Response

Upon successful magic link authentication, the following tokens are returned:

| Token             | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| **Access Token**  | API authorization (short-lived, ~1 hour)               |
| **ID Token**      | User identity claims (email, sub, custom attributes)   |
| **Refresh Token** | Obtain new tokens without re-authentication (~30 days) |

> **Note**: Token storage strategy (localStorage, sessionStorage, memory, cookies) is the consumer's decision based on security requirements.

## Cognito Authentication

### Infrastructure (`infra/`)

The infrastructure is organized into reusable CDK constructs:

- **`UserPool`** - Creates and configures AWS Cognito User Pool
- **`CognitoTriggers`** - Generic Lambda handlers for custom auth flow (supports multiple auth methods)
- **`MagicLink`** - Magic Link specific resources (KMS key, DynamoDB table, permissions)

### Lambda Functions (`functions/`)

```
functions/src/cognito/
├── common.ts                          # Shared utilities (Logger, UserFacingError)
├── handlers/                          # Generic Cognito Lambda trigger handlers
│   ├── define-auth-challenge.ts      # Orchestrates auth flow based on signInMethod
│   ├── create-auth-challenge.ts      # Delegates challenge creation to auth methods
│   ├── verify-auth-challenge-response.ts  # Delegates verification to auth methods
│   └── pre-signup.ts                 # Auto-confirms users
└── custom-auth/                      # Auth method implementations
    └── magic-link.ts                 # Magic Link create/verify logic
```

## Magic Link Authentication

Magic Links provide a secure, passwordless authentication method where users receive a time-limited sign-in link via email.

### How It Works

1. User enters email address
2. System generates a cryptographically signed magic link using AWS KMS
3. Link is sent via Amazon SES
4. User clicks link to authenticate
5. System verifies signature and issues Cognito tokens

### URL Structure

Magic links use hash fragments (not query parameters) to pass the secret:

```
https://app.example.com/auth/callback#<message.base64url>.<signature.base64url>
```

Where `message` is a base64url-encoded JSON object containing:

```json
{
  "userName": "user@example.com",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Why hash fragments?**

- Hash fragments are not sent to the server in HTTP requests
- Prevents magic link secrets from appearing in server logs
- Client-side JavaScript extracts the secret for verification

The URL does **not** contain a session token. Sessions are managed by Cognito and stored in HttpOnly cookies.

> **Authentication flows**: See [Authentication Architecture](../../docs/auth.md#magic-link-callback-flow) for detailed sequence diagrams.

### Cross-Browser Support

Magic links work even when opened in a different browser or device:

- **Same-browser**: Session is retrieved from an **HttpOnly cookie** set by the server after `initiateMagicLink`
- **Cross-browser**: Client detects missing session (server returns error) and calls `initiateMagicLink` again to get a new session

**Cookie Security**:

- Cookies are set **server-side** with `HttpOnly`, `Secure`, and `SameSite=Strict` attributes
- Session tokens are inaccessible to JavaScript (prevents XSS attacks)
- Cookies are automatically deleted after successful authentication (one-time use)

The `completeMagicLink` server function reads the session from cookies:

- If cookie exists: Uses the existing session for `RespondToAuthChallenge`
- If cookie missing: Returns error, triggering cross-browser flow in client

### Security Features

- **RSA-2048 KMS signing** - Links are signed with AWS KMS using RSASSA_PSS_SHA_512
- **Time-limited** - Links expire after 15 minutes (configurable)
- **One-time use** - Each link can only be used once
- **Rate limiting** - Minimum 1 minute between link requests (configurable)
- **Origin validation** - Only allowed origins can request magic links
- **HttpOnly cookies** - Session tokens stored in HttpOnly cookies (inaccessible to JavaScript)
- **Secure cookies** - HTTPS only transmission (prevents man-in-the-middle attacks)
- **SameSite=Strict** - CSRF protection via strict same-site cookie policy

### Infrastructure Components

**KMS Key**

- RSA-2048 asymmetric key for signing/verification
- Separate key permissions for signing (CreateAuthChallenge) and verification (VerifyAuthChallengeResponse)

**DynamoDB Table**

- Stores magic link metadata (hashed usernames and signatures)
- TTL enabled on `exp` attribute for automatic cleanup
- Conditional writes for rate limiting

**IAM Permissions**

- SES SendEmail for CreateAuthChallenge Lambda
- KMS Sign for CreateAuthChallenge Lambda
- KMS GetPublicKey for VerifyAuthChallengeResponse Lambda
- DynamoDB read/write for both Lambdas

## Configuration

### Example Setup (`infra/Main.ts`)

```typescript
import { CognitoTriggers } from './cognito/CognitoTriggers.ts';
import { MagicLink } from './cognito/MagicLink.ts';
import { UserPool } from './cognito/UserPool.ts';

// Create UserPool
const mainUserPool = new UserPool(stack, 'main', {
  clients: {
    main: {
      generateSecret: true,
    },
  },
});

// Create generic Cognito triggers
const cognitoTriggers = new CognitoTriggers(stack, 'cognito-triggers', {
  userPool: mainUserPool.userPool,
  autoConfirmUsers: true,
  logLevel: 'INFO', // DEBUG | INFO | ERROR
});

// Configure Magic Link authentication
const magicLink = new MagicLink(stack, 'magic-link', {
  cognitoTriggers,
  allowedOrigins: ['https://app.example.com'],
  ses: {
    fromAddress: 'noreply@example.com',
    region: 'us-east-1', // Optional, defaults to stack region
  },
  expiryDuration: Duration.minutes(15), // Optional
  minimumInterval: Duration.minutes(1), // Optional
});
```

### Local Development

When running services locally that consume the auth internal API, you need AWS credentials for request signing:

```bash
# Using aws-vault (recommended)
aws-vault exec <profile> -- pnpm dev

# Or with environment variables
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx AWS_REGION=us-east-1 pnpm dev
```

See [Internal API Documentation](../../docs/internal-api.md) for more details on local development setup.

### Environment Variables

Lambda functions are configured with the following environment variables (automatically set by infrastructure constructs):

#### All Cognito Trigger Lambdas

| Variable    | Description       | Default |
| ----------- | ----------------- | ------- |
| `LOG_LEVEL` | Logging verbosity | `INFO`  |

#### CreateAuthChallenge Lambda

| Variable                 | Description                              | Default      |
| ------------------------ | ---------------------------------------- | ------------ |
| `MAGIC_LINK_ENABLED`     | Enable magic link auth                   | `TRUE`       |
| `ALLOWED_ORIGINS`        | Comma-separated allowed redirect origins | -            |
| `SES_FROM_ADDRESS`       | Email sender address                     | -            |
| `SES_REGION`             | AWS region for SES                       | Stack region |
| `KMS_KEY_ID`             | KMS key ID/alias for signing             | -            |
| `DYNAMODB_SECRETS_TABLE` | DynamoDB table for magic link state      | -            |
| `SECONDS_UNTIL_EXPIRY`   | Link expiration in seconds               | `900`        |
| `MIN_SECONDS_BETWEEN`    | Rate limiting interval in seconds        | `60`         |
| `STACK_ID`               | CloudFormation stack ID (used as salt)   | Auto         |

#### VerifyAuthChallengeResponse Lambda

| Variable                 | Description                     |
| ------------------------ | ------------------------------- |
| `MAGIC_LINK_ENABLED`     | Enable magic link auth          |
| `ALLOWED_ORIGINS`        | Comma-separated allowed origins |
| `DYNAMODB_SECRETS_TABLE` | DynamoDB table name             |
| `STACK_ID`               | CloudFormation stack ID         |

#### Internal API Lambda

| Variable               | Description                           |
| ---------------------- | ------------------------------------- |
| `COGNITO_USER_POOL_ID` | Cognito User Pool ID (via SST Config) |
| `COGNITO_CLIENT_ID`    | Cognito Client ID (via SST Config)    |

## Related Documentation

- **[Magic Link Implementation](../../docs/magic-link-implementation.md)** - Code flow, key files, Cognito triggers, infrastructure constructs
- **[Authentication Architecture](../../docs/auth.md)** - Design principles, flow diagrams, security model
- **[Internal API](../../docs/internal-api.md)** - Contract-first design, client creation, IAM authentication
- **[IAC Patterns](../../docs/iac-patterns.md)** - Service configuration, SSM parameters, dependencies
- **[Auth Reference Architecture](../../docs/auth-reference-architecture.md)** - Detailed Cognito flows, FIDO2/WebAuthn patterns

## References

Based on AWS sample: [amazon-cognito-passwordless-auth](https://github.com/aws-samples/amazon-cognito-passwordless-auth)
