# Magic Link Implementation

Technical documentation for the Magic Link authentication implementation in the auth service.

> **Architecture overview**: See [Authentication Architecture](./auth.md) for high-level design principles and security model.
>
> **Quick reference**: See [Auth Service README](../services/auth/README.md) for API endpoints and configuration.

## Table of Contents

- [Code Flow Overview](#code-flow-overview)
- [Key Files](#key-files)
- [Cognito Custom Auth Flow](#cognito-custom-auth-flow)
- [Implementation Details](#implementation-details)
- [Infrastructure Constructs](#infrastructure-constructs)
- [Extensibility](#extensibility)

## Code Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Magic Link Flow                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INITIATE (user requests magic link)                                 │
│     ─────────────────────────────────────────────────────────────────   │
│     Consumer Service                     Auth Service                    │
│     ┌─────────────────┐                  ┌─────────────────────────┐    │
│     │ Server Function │ ─── ORPC ──────► │ Internal API Lambda     │    │
│     │ (main-ui)       │    POST /auth/   │ initiateMagicLink()     │    │
│     └────────┬────────┘    magic-link/   └───────────┬─────────────┘    │
│              │             initiate                  │                   │
│              │                                       ▼                   │
│              │                           ┌─────────────────────────┐    │
│              │                           │ Cognito InitiateAuth    │    │
│              │                           │ (CUSTOM_AUTH flow)      │    │
│              │                           └───────────┬─────────────┘    │
│              │                                       │ triggers         │
│              │                                       ▼                   │
│              │                           ┌─────────────────────────┐    │
│              │                           │ DefineAuthChallenge     │    │
│              │                           │ → returns CUSTOM_CHALLENGE│   │
│              │                           └───────────┬─────────────┘    │
│              │                                       │ triggers         │
│              │                                       ▼                   │
│              │                           ┌─────────────────────────┐    │
│              │                           │ CreateAuthChallenge     │    │
│              │                           │ → magic-link.ts:        │    │
│              │                           │   - Sign with KMS       │    │
│              │                           │   - Store in DynamoDB   │    │
│              │                           │   - Send email via SES  │    │
│              │                           └───────────┬─────────────┘    │
│              │                                       │                   │
│              ◄───────────── session token ───────────┘                   │
│              │                                                          │
│     ┌────────▼────────┐                                                 │
│     │ Set HttpOnly    │                                                 │
│     │ cookie with     │                                                 │
│     │ session         │                                                 │
│     └─────────────────┘                                                 │
│                                                                          │
│  2. COMPLETE (user clicks link)                                         │
│     ─────────────────────────────────────────────────────────────────   │
│     Consumer Service                     Auth Service                    │
│     ┌─────────────────┐                  ┌─────────────────────────┐    │
│     │ Client extracts │                  │                         │    │
│     │ secret from     │                  │                         │    │
│     │ URL hash        │                  │                         │    │
│     └────────┬────────┘                  │                         │    │
│              │                           │                         │    │
│     ┌────────▼────────┐                  │                         │    │
│     │ Server Function │ ─── ORPC ──────► │ Internal API Lambda     │    │
│     │ reads session   │    POST /auth/   │ completeMagicLink()     │    │
│     │ from cookie     │    magic-link/   └───────────┬─────────────┘    │
│     └────────┬────────┘    complete                  │                   │
│              │                                       ▼                   │
│              │                           ┌─────────────────────────┐    │
│              │                           │ Cognito                 │    │
│              │                           │ RespondToAuthChallenge  │    │
│              │                           └───────────┬─────────────┘    │
│              │                                       │ triggers         │
│              │                                       ▼                   │
│              │                           ┌─────────────────────────┐    │
│              │                           │ VerifyAuthChallenge     │    │
│              │                           │ → magic-link.ts:        │    │
│              │                           │   - Verify KMS signature│    │
│              │                           │   - Check DynamoDB      │    │
│              │                           │   - Delete (one-time)   │    │
│              │                           └───────────┬─────────────┘    │
│              │                                       │                   │
│              ◄───────── tokens (access, id, refresh) ┘                   │
│              │                                                          │
│     ┌────────▼────────┐                                                 │
│     │ Delete session  │                                                 │
│     │ cookie, return  │                                                 │
│     │ tokens to client│                                                 │
│     └─────────────────┘                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Files

| Layer          | File                                                            | Purpose                                         |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| **Contract**   | `packages/contract-internal-api/src/auth.ts`                    | API schema (initiate/complete inputs & outputs) |
| **Router**     | `services/auth/functions/src/internal-api/router.ts`            | ORPC handlers calling Cognito SDK               |
| **Triggers**   | `services/auth/functions/src/cognito/handlers/*.ts`             | Cognito Lambda trigger handlers                 |
| **Magic Link** | `services/auth/functions/src/cognito/custom-auth/magic-link.ts` | KMS signing, DynamoDB storage, SES email        |
| **Infra**      | `services/auth/infra/cognito/MagicLink.ts`                      | KMS key, DynamoDB table, IAM permissions        |
| **Infra**      | `services/auth/infra/cognito/CognitoTriggers.ts`                | Lambda functions for Cognito triggers           |
| **Infra**      | `services/auth/infra/cognito/UserPool.ts`                       | Cognito User Pool configuration                 |

## Cognito Custom Auth Flow

The authentication uses Cognito's `CUSTOM_AUTH` flow with four Lambda triggers:

| Trigger                       | Handler File                                 | Purpose                                |
| ----------------------------- | -------------------------------------------- | -------------------------------------- |
| `DefineAuthChallenge`         | `handlers/define-auth-challenge.ts`          | Orchestrates flow, decides next step   |
| `CreateAuthChallenge`         | `handlers/create-auth-challenge.ts`          | Dispatches to auth method (magic-link) |
| `VerifyAuthChallengeResponse` | `handlers/verify-auth-challenge-response.ts` | Dispatches verification to auth method |
| `PreSignUp`                   | `handlers/pre-signup.ts`                     | Auto-confirms users                    |

### Flow Sequence

1. `InitiateAuth` → triggers `DefineAuthChallenge` → returns `CUSTOM_CHALLENGE`
2. → triggers `CreateAuthChallenge` → calls `magic-link.addChallengeToEvent()`
3. User clicks link, `RespondToAuthChallenge` → triggers `VerifyAuthChallengeResponse`
4. → calls `magic-link.addChallengeVerificationResultToEvent()`
5. → triggers `DefineAuthChallenge` again → returns `ISSUE_TOKENS` if verified

### DefineAuthChallenge Logic

```typescript
// Simplified flow logic in define-auth-challenge.ts
if (session.length === 0) {
  // First call - issue a custom challenge
  return {
    challengeName: 'CUSTOM_CHALLENGE',
    issueTokens: false,
    failAuthentication: false,
  };
}

const lastChallenge = session[session.length - 1];
if (lastChallenge.challengeResult === true) {
  // Challenge succeeded - issue tokens
  return { issueTokens: true, failAuthentication: false };
}

// Challenge failed
return { issueTokens: false, failAuthentication: true };
```

## Implementation Details

### Exported Functions

`magic-link.ts` exports two functions that integrate with the Cognito trigger handlers:

```typescript
// Called by CreateAuthChallenge handler
export async function addChallengeToEvent(
  event: CreateAuthChallengeTriggerEvent,
  logger: Logger
): Promise<void>;

// Called by VerifyAuthChallengeResponse handler
export async function addChallengeVerificationResultToEvent(
  event: VerifyAuthChallengeResponseTriggerEvent,
  logger: Logger
): Promise<void>;
```

### addChallengeToEvent (Create Challenge)

Called when a user initiates magic link authentication:

1. **Validate origin** - Check `redirectUri` against `ALLOWED_ORIGINS`
2. **Rate limit check** - Query DynamoDB, reject if last request < `MIN_SECONDS_BETWEEN`
3. **Create message** - `{ userName, iat, exp }` as JSON
4. **Sign message** - Use KMS with RSASSA_PSS_SHA_512 algorithm
5. **Store in DynamoDB** - Hashed signature with TTL for automatic cleanup
6. **Send email** - Via SES with magic link URL containing `message.signature`

```typescript
// Simplified implementation
const message = JSON.stringify({
  userName: event.request.userAttributes.email,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + config.secondsUntilExpiry,
});

const signature = await kmsClient.send(
  new SignCommand({
    KeyId: config.kmsKeyId,
    Message: Buffer.from(message),
    MessageType: 'RAW',
    SigningAlgorithm: 'RSASSA_PSS_SHA_512',
  })
);

const secret = `${base64url(message)}.${base64url(signature.Signature)}`;
const magicLink = `${redirectUri}#${secret}`;

await sesClient.send(
  new SendEmailCommand({
    /* ... */
  })
);
```

### addChallengeVerificationResultToEvent (Verify)

Called when a user clicks the magic link:

1. **Parse secret** - Split challenge answer into message and signature (base64url)
2. **Verify signature** - Use KMS public key to verify
3. **Check expiration** - Compare `exp` claim against current time
4. **Atomic delete** - Remove from DynamoDB (ensures one-time use)
5. **Set result** - `event.response.answerCorrect = true` if valid

```typescript
// Simplified implementation
const [messageB64, signatureB64] = challengeAnswer.split('.');
const message = JSON.parse(base64urlDecode(messageB64));

// Verify signature
const publicKey = await getPublicKey(config.kmsKeyId);
const isValid = crypto.verify(
  'RSA-SHA512',
  Buffer.from(messageB64),
  { key: publicKey, padding: crypto.constants.RSA_PKCS1_PSS_PADDING },
  base64urlDecode(signatureB64)
);

// Check expiration
if (message.exp < Math.floor(Date.now() / 1000)) {
  throw new UserFacingError('Magic link has expired');
}

// Atomic delete (one-time use)
await dynamoClient.send(
  new DeleteCommand({
    TableName: config.tableName,
    Key: { pk: hashedSignature },
    ConditionExpression: 'attribute_exists(pk)',
  })
);

event.response.answerCorrect = isValid;
```

### Error Handling

The implementation uses a `UserFacingError` class for errors that should be shown to users:

```typescript
// common.ts
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}
```

Common error scenarios:

- **Invalid origin** - `redirectUri` not in `ALLOWED_ORIGINS`
- **Rate limited** - Request too soon after previous request
- **Expired link** - `exp` claim in the past
- **Already used** - DynamoDB conditional delete fails
- **Invalid signature** - KMS verification fails

## Infrastructure Constructs

### Construct Composition

```typescript
// infra/Main.ts - How constructs are composed

// 1. Create User Pool
const userPool = new UserPool(stack, 'main', {
  clients: { main: { generateSecret: true } },
});

// 2. Create generic Cognito triggers (shared by all auth methods)
const cognitoTriggers = new CognitoTriggers(stack, 'cognito-triggers', {
  userPool: userPool.userPool,
  autoConfirmUsers: true,
});

// 3. Add Magic Link resources and wire them to triggers
const magicLink = new MagicLink(stack, 'magic-link', {
  cognitoTriggers,
  allowedOrigins: ['https://app.example.com'],
  ses: { fromAddress: 'noreply@example.com' },
});
```

### MagicLink Construct

The `MagicLink` construct (`infra/cognito/MagicLink.ts`) creates:

| Resource       | Type                   | Purpose                                      |
| -------------- | ---------------------- | -------------------------------------------- |
| KMS Key        | RSA-2048 asymmetric    | Sign (create) and verify (complete) links    |
| DynamoDB Table | On-demand, TTL enabled | Store magic link state, enforce one-time use |

**Environment variables added to Cognito trigger Lambdas:**

| Variable                 | Lambda                 | Value                    |
| ------------------------ | ---------------------- | ------------------------ |
| `MAGIC_LINK_ENABLED`     | CreateAuth, VerifyAuth | `TRUE`                   |
| `ALLOWED_ORIGINS`        | CreateAuth, VerifyAuth | Comma-separated origins  |
| `KMS_KEY_ID`             | CreateAuth             | KMS key ARN              |
| `DYNAMODB_SECRETS_TABLE` | CreateAuth, VerifyAuth | Table name               |
| `SES_FROM_ADDRESS`       | CreateAuth             | Sender email             |
| `SES_REGION`             | CreateAuth             | SES region               |
| `SECONDS_UNTIL_EXPIRY`   | CreateAuth             | Link TTL (default: 900)  |
| `MIN_SECONDS_BETWEEN`    | CreateAuth             | Rate limit (default: 60) |

**IAM permissions granted:**

| Permission            | Lambda     | Resource      |
| --------------------- | ---------- | ------------- |
| `kms:Sign`            | CreateAuth | KMS key       |
| `kms:GetPublicKey`    | VerifyAuth | KMS key       |
| `ses:SendEmail`       | CreateAuth | SES identity  |
| `dynamodb:PutItem`    | CreateAuth | Secrets table |
| `dynamodb:GetItem`    | VerifyAuth | Secrets table |
| `dynamodb:DeleteItem` | VerifyAuth | Secrets table |

### CognitoTriggers Construct

The `CognitoTriggers` construct (`infra/cognito/CognitoTriggers.ts`) creates the four Lambda functions and attaches them to the User Pool:

```typescript
export class CognitoTriggers extends Construct {
  readonly defineAuthChallengeFn: Function;
  readonly createAuthChallengeFn: Function;
  readonly verifyAuthChallengeResponseFn: Function;
  readonly preSignUpFn: Function;

  constructor(scope: Construct, id: string, props: CognitoTriggersProps) {
    // Create Lambda functions...
    // Attach to User Pool triggers...
  }
}
```

Auth method constructs (like `MagicLink`) receive `cognitoTriggers` and:

1. Add environment variables to the appropriate Lambdas
2. Grant IAM permissions for their resources

## Extensibility

The architecture supports additional auth methods (FIDO2, SMS OTP) by:

1. **Add implementation file** - `functions/src/cognito/custom-auth/<method>.ts`
2. **Export standard functions** - `addChallengeToEvent` and `addChallengeVerificationResultToEvent`
3. **Create infrastructure construct** - `infra/cognito/<Method>.ts`
4. **Update handlers** - Add case to switch statements in `create-auth-challenge.ts` and `verify-auth-challenge-response.ts`

The `signInMethod` is passed via `clientMetadata` in the Cognito `InitiateAuth` call, allowing handlers to dispatch to the correct implementation.

## Related Documentation

- **[Authentication Architecture](./auth.md)** - Design principles, security model, callback flows
- **[Auth Service README](../services/auth/README.md)** - API endpoints, configuration, environment variables
- **[Internal API](./internal-api.md)** - Contract-first design, client creation
- **[Auth Reference Architecture](./auth-reference-architecture.md)** - Detailed Cognito flows, FIDO2/WebAuthn patterns

## References

Based on AWS sample: [amazon-cognito-passwordless-auth](https://github.com/aws-samples/amazon-cognito-passwordless-auth)
