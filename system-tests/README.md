# System Tests

Integration tests that run against deployed services to verify end-to-end behavior in isolation.

## Overview

System tests are designed to test services after they're deployed to AWS. Unlike unit tests that mock dependencies, system tests call real service endpoints and verify actual behavior using type-safe ORPC clients.

**IMPORTANT**: Because system tests run against deployed AWS resources, you need valid AWS credentials to execute them.

## Prerequisites

Before running system tests, ensure you have:

1. **AWS Credentials**: Valid AWS credentials configured (e.g., via aws-vault, AWS CLI profiles, or environment variables)
2. **Deployed Services**: The services you're testing must be deployed to AWS
3. **Stage Name**: Know which stage (e.g., `dev`, `test`, `preview`) you're testing against

### Setting Up AWS Credentials

```bash
# Using aws-vault (recommended)
aws-vault exec <profile-name> -- pnpm system-tests --stage dev

# Using AWS CLI profile
AWS_PROFILE=<profile-name> pnpm system-tests --stage dev

# Using environment variables (if credentials are already configured)
pnpm system-tests --stage dev
```

## When to Use System Tests

**IMPORTANT**: System tests are integration tests that can be slow and flaky because they depend on real AWS resources, network conditions, and service availability. **Reserve system tests for critical paths only** instead of trying to test all scenarios. Focus on the most important user flows and edge cases that must work in production.

Use system tests to:

- **Test critical user flows end-to-end**: Login, checkout, core business operations
- **Test service isolation**: Verify a service works correctly by calling its internal API
- **Test event-driven flows**: Dispatch events and verify they're processed correctly
- **Test cross-service integrations**: Verify services communicate correctly (when critical)
- **Test against real infrastructure**: Use real DynamoDB, SQS, Lambda, etc. (not mocks)
- **Test production-like scenarios**: Verify behavior in a deployed environment

## When NOT to Use System Tests

Don't use system tests for:

- **All possible scenarios**: Test critical paths only; use unit tests for comprehensive coverage
- **Unit testing business logic**: Use unit tests in `functions/src/` instead (faster, more reliable)
- **Infrastructure validation**: Use infrastructure tests in `infra/*.test.ts` instead
- **Manual UI testing**: Use manual browser testing (see `docs/manual-testing.md`)
- **Testing implementation details**: Test behavior, not internals
- **Edge cases that can be unit tested**: Unit tests are faster and less flaky

## Test Structure

System tests typically:

1. **Setup**: Configure test environment (stage, credentials, service URLs)
2. **Execute**: Call internal API endpoints or dispatch events to deployed services
3. **Verify**: Assert on response data or side effects
4. **Cleanup**: Remove test data if necessary

## Running Tests

**Note**: System tests require AWS credentials because they run against deployed AWS resources.

### Basic Usage

```bash
# Specify stage (required)
pnpm system-tests --stage dev
pnpm system-tests --stage test

# Specify custom region (defaults to us-west-2)
pnpm system-tests --stage dev --region us-east-1

# Using aws-vault with stage
aws-vault exec <profile-name> -- pnpm system-tests --stage dev

# Using AWS CLI profile with stage
AWS_PROFILE=<profile-name> pnpm system-tests --stage test

# Watch mode for development
pnpm system-tests:watch --stage dev

# From root (via Turborepo)
cd system-tests && pnpm system-tests -- --stage dev
```

### Advanced Usage

The `--stage` and `--region` parameters are intercepted and set as `STAGE` and `AWS_REGION` environment variables. All other parameters are passed through to Vitest:

```bash
# Run specific test file
pnpm system-tests --stage dev src/services/auth/auth.test.ts

# Run with custom region
pnpm system-tests --stage dev --region us-east-1

# Run with custom reporter
pnpm system-tests --stage test --reporter=verbose

# Run tests matching a pattern
pnpm system-tests --stage dev --grep "magic link"

# Run with coverage
pnpm system-tests --stage test --coverage

# Combine with any Vitest CLI options
pnpm system-tests --stage dev --bail --no-isolate
```

### Other Commands

```bash
pnpm type-check          # Type check all test files
pnpm lint                # Lint all test files
```

## Writing Tests

### Configuration

System tests use centralized configuration via the `config.ts` module:

```typescript
import { STAGE, REGION } from './config.ts';

// STAGE: The deployment stage being tested (e.g., 'dev', 'test', 'preview')
//        Set via --stage CLI argument (required)
//        Throws error if not set

// REGION: AWS region where services are deployed (defaults to 'us-west-2')
//         Set via --region CLI argument

console.log(`Testing stage: ${STAGE} in region: ${REGION}`);
```

### Service Config Helper

Use `getServiceConfig()` to fetch service URLs from SSM Parameter Store. It automatically uses `STAGE` and `REGION` from config:

```typescript
import { getServiceConfig } from './helpers/serviceConfig.ts';

// Fetch auth service internal API URL
// Path is type-safe: only valid "service-name/resource-key" combinations allowed
const authApiUrl = await getServiceConfig('auth/internal-api-url');

// Fetch shared-infra internal API ID
const internalApiId = await getServiceConfig('shared-infra/internal-api-id');
```

**How it works:**

- Paths follow the pattern: `service-name/resource-key`
- Type-safe: TypeScript validates paths against `@lib/sst-helpers` service config
- Fetches from SSM using pattern: `/service/<service-name>/<stage>/<resource-key>`
- Cached: Only makes 1 SDK call per parameter
- Uses AWS credentials from environment

### Creating ORPC Clients

Use type-safe ORPC clients to call internal APIs with automatic AWS Signature V4 signing:

```typescript
import { createInternalApiClient } from '@client/internal-api';
import { auth } from '@contract/internal-api';
import { getServiceConfig } from './helpers/serviceConfig.ts';

// Fetch service URL from SSM
const authApiUrl = await getServiceConfig('auth/internal-api-url');

// Create type-safe ORPC client
const authClient = createInternalApiClient({
  contract: auth.contract,
  baseUrl: authApiUrl,
  // AWS SigV4 signing is enabled by default
  // Uses AWS_REGION and AWS credentials from environment
});

// Make type-safe API calls
const response = await authClient.magicLink.initiate({
  email: 'test@example.com',
  redirectUri: 'https://example.com/auth/callback',
});
// TypeScript knows the exact shape of response!
```

### Example: Testing Internal API with ORPC

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createInternalApiClient } from '@client/internal-api';
import { auth } from '@contract/internal-api';
import { getServiceConfig } from './helpers/serviceConfig.ts';
import { STAGE, REGION } from './config.ts';

describe('Auth Service - Magic Link', () => {
  let authClient: ReturnType<
    typeof createInternalApiClient<typeof auth.contract>
  >;

  beforeAll(async () => {
    // Fetch service URL from SSM Parameter Store
    const authApiUrl = await getServiceConfig('auth/internal-api-url');

    console.log(
      `Testing auth at: ${authApiUrl} (region: ${REGION}, stage: ${STAGE})`
    );

    // Create ORPC client with AWS SigV4 signing
    authClient = createInternalApiClient({
      contract: auth.contract,
      baseUrl: authApiUrl,
      // AWS SigV4 signing is enabled by default
    });
  });

  it('should initiate magic link authentication', async () => {
    const response = await authClient.magicLink.initiate({
      email: 'test@example.com',
      redirectUri: 'https://example.com/auth/callback',
    });

    // Type-safe response with autocomplete
    expect(response).toHaveProperty('session');
    expect(response).toHaveProperty('message');
    expect(response.session.length).toBeGreaterThan(0);
    expect(response.message.length).toBeGreaterThan(0);
  });

  it('should reject invalid email format', async () => {
    await expect(
      authClient.magicLink.initiate({
        email: 'invalid-email',
        redirectUri: 'https://example.com/auth/callback',
      })
    ).rejects.toThrow();
  });
});
```

## Architecture

### File Structure

```
system-tests/
├── src/
│   ├── config.ts                    # STAGE and REGION configuration
│   ├── helpers/
│   │   ├── ssm.ts                   # Low-level SSM parameter fetching
│   │   └── serviceConfig.ts         # High-level service config helper
│   └── services/
│       └── auth/
│           └── auth.test.ts         # Auth service integration tests
├── run-tests.mjs                    # Custom test runner (intercepts --stage/--region)
├── vitest.config.ts                 # Vitest configuration
└── package.json
```

### How It Works

1. **Test Runner** (`run-tests.mjs`)
   - Intercepts `--stage` and `--region` CLI arguments
   - Sets `STAGE` and `AWS_REGION` environment variables
   - Passes remaining arguments to Vitest

2. **Configuration** (`src/config.ts`)
   - Exports `STAGE` (required, from `--stage` argument)
   - Exports `REGION` (defaults to `us-west-2`, from `--region` argument)

3. **Service Config** (`src/helpers/serviceConfig.ts`)
   - Uses `getServiceConfig(path)` to fetch service URLs from SSM
   - Automatically uses `STAGE` and `REGION` from config
   - Type-safe paths validated against `@lib/sst-helpers`

4. **SSM Helper** (`src/helpers/ssm.ts`)
   - Low-level `fetchParameter()` function for SSM SDK calls
   - Caches parameters to avoid repeated API calls
   - Used internally by `getServiceConfig()`

5. **ORPC Clients**
   - Create type-safe clients using `createInternalApiClient()`
   - Automatically signs requests with AWS Signature V4
   - Contracts defined in `@contract/internal-api`

### Data Flow

```
User runs: pnpm system-tests --stage dev --region us-west-2
    ↓
run-tests.mjs sets environment variables
    ↓
config.ts exports STAGE='dev', REGION='us-west-2'
    ↓
Test calls: getServiceConfig('auth/internal-api-url')
    ↓
Builds parameter name: /service/auth/dev/internal-api-url
    ↓
fetchParameter() fetches from SSM (cached)
    ↓
Returns: https://xxx.execute-api.us-west-2.amazonaws.com
    ↓
createInternalApiClient() creates ORPC client
    ↓
authClient.magicLink.initiate(...) → AWS SigV4 signed request
```

## Best Practices

1. **Focus on critical paths**: System tests are slow and can be flaky - test only the most important user flows
2. **Prefer unit tests for comprehensive coverage**: Use unit tests for edge cases, error handling, and business logic
3. **Always specify stage**: Use `--stage` argument to target the correct environment
4. **Test against ephemeral stages**: Use `dev` or `preview` stages, not `production`
5. **Use unique test data**: Prefix test emails/IDs with `test-` or use UUIDs
6. **Clean up test data**: Remove created resources after tests complete
7. **Keep tests independent**: Each test should run in isolation without side effects
8. **Use type-safe clients**: Always use ORPC clients for API calls
9. **Validate inputs**: Test both success and error paths (invalid inputs) only for critical flows
10. **Set appropriate timeouts**: Default is 30s per test (configure in vitest.config.ts)
11. **Accept some flakiness**: System tests depend on network and AWS - retry failed tests before investigating

## Troubleshooting

### Common Issues

**"STAGE environment variable not set"**

- Solution: Add `--stage <name>` to your command

**"Failed to get SSM parameter"**

- Verify the service is deployed to the specified stage
- Check AWS credentials are valid
- Verify you have SSM read permissions
- Ensure the region is correct (use `--region` if needed)

**"Request failed with status 403"**

- AWS credentials may be expired or invalid
- Check if your IAM role has permission to invoke the API Gateway
- Verify the API Gateway resource policy allows your AWS account

**Type errors in test file**

- Run `pnpm type-check` to see detailed errors
- Ensure `@contract/internal-api` is up to date
- Rebuild packages: `cd packages/sst-helpers && pnpm build`

## Related Documentation

- **[IAC Testing](../docs/iac-testing.md)**: Infrastructure tests for SST/CDK code
- **[Manual Browser Testing](../docs/manual-testing.md)**: Interactive browser testing for UI
- **[AGENTS.md](../AGENTS.md)**: Project overview and commands
