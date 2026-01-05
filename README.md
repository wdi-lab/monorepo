# TanStack Start Monorepo

A modern, full-stack monorepo powered by [TanStack Start](https://tanstack.com/start), [Turborepo](https://turbo.build/repo), and [pnpm](https://pnpm.io/).

> **For AI Agents**: This project includes detailed development guidelines in `AGENTS.md` and specialized agents in `.opencode/agent/`. See [Available AI Agents](#available-ai-agents) below.

## Tech Stack

- **Framework**: TanStack Start (React 19)
- **Router**: TanStack Router
- **UI Library**: Chakra UI v3
- **Build Tool**: Vite
- **Package Manager**: pnpm with workspace catalogs
- **Monorepo**: Turborepo
- **Validation**: Zod v4
- **TypeScript**: v5.9.3
- **Linting**: ESLint (flat config)
- **Formatting**: Prettier
- **Infrastructure**: SST v2, AWS CDK
- **Internal APIs**: ORPC (contract-first, type-safe RPC)

## Structure

```
.
├── services/
│   ├── main-ui/              # TanStack Start application
│   ├── main-api/             # Main API service (SST + Lambda)
│   └── auth/                 # Auth service (Cognito + Internal API)
├── packages/
│   ├── ui/                   # Shared UI components (Chakra UI)
│   ├── contract-internal-api/ # Shared API contracts (ORPC)
│   ├── client-internal-api/  # ORPC client with AWS SigV4 signing
│   ├── sst-constructs/       # Shared SST/CDK constructs
│   ├── sst-helpers/          # SST utility functions
│   ├── config-eslint/        # Shared ESLint configurations
│   └── config-tsconfig/      # Shared TypeScript configurations
├── system-tests/             # Integration tests for deployed services
├── docs/                     # Documentation
│   ├── local-dev.md          # Local development guide
│   ├── manual-testing.md     # Manual browser testing guide
│   ├── internal-api.md       # Internal API guide
│   ├── iac-testing.md        # Infrastructure testing guide
│   └── iac-patterns.md       # Infrastructure patterns
└── .vscode/                  # VS Code workspace settings
```

## Prerequisites

- **Node.js**: >= 22
- **pnpm**: >= 10.26.2

## Getting Started

### Installation

```bash
pnpm install
```

### Development

Start all services in development mode:

```bash
pnpm dev
```

The main-ui service will be available at `http://localhost:3000`

#### Running with AWS Credentials

Services that call internal APIs (via `@client/internal-api`) require AWS credentials for request signing. Use `aws-vault` or set environment variables:

```bash
# Using aws-vault (recommended)
aws-vault exec <profile> -- pnpm dev

# Or with AWS environment variables
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx AWS_REGION=us-east-1 pnpm dev
```

The internal API client automatically detects region from API Gateway/Lambda URLs and signs requests with AWS Signature V4.

### Build

Build all packages and services:

```bash
pnpm build
```

### Linting

Run ESLint across all packages:

```bash
pnpm lint
```

### Type Checking

Run TypeScript type checking:

```bash
pnpm type-check
```

### Formatting

Format code with Prettier:

```bash
pnpm format
```

### Testing

#### Unit and Infrastructure Tests

Run tests for a specific package or service:

```bash
cd services/main-ui/app && pnpm test        # Watch mode
cd services/main-ui/app && pnpm test:run    # Single run
cd services/auth/infra && pnpm test         # Infrastructure tests
```

See [IAC Testing Guide](docs/iac-testing.md) for infrastructure testing patterns.

#### System Tests (Integration)

**IMPORTANT**: System tests are integration tests that run against deployed AWS services. They can be slow and flaky, so **reserve them for critical paths only**.

System tests verify end-to-end behavior by calling real service endpoints with type-safe ORPC clients. They require:

- Valid AWS credentials (aws-vault recommended)
- Deployed services to test against
- Stage name (e.g., `dev`, `test`, `preview`)

```bash
# Run system tests against deployed stage
cd system-tests && aws-vault exec <profile> -- pnpm system-tests -- --stage dev

# Specify custom region (defaults to us-west-2)
cd system-tests && pnpm system-tests -- --stage dev --region us-east-1

# Watch mode for development
cd system-tests && pnpm system-tests:watch -- --stage dev
```

**When to use system tests:**

- Test critical user flows end-to-end (login, checkout, core operations)
- Verify cross-service integrations for critical paths
- Test against real AWS infrastructure (DynamoDB, SQS, Lambda)

**When NOT to use system tests:**

- Comprehensive scenario coverage (use unit tests instead - faster, more reliable)
- Business logic validation (use unit tests)
- Edge cases (use unit tests unless critical)

See [system-tests/README.md](system-tests/README.md) for detailed usage and examples.

## Documentation

- [Local Development Guide](docs/local-dev.md) - Running backend and frontend services locally
- [Manual Browser Testing](docs/manual-testing.md) - Interactive browser testing with Playwright
- [Internal API Guide](docs/internal-api.md) - Type-safe inter-service communication with ORPC
- [IAC Testing Guide](docs/iac-testing.md) - Testing AWS infrastructure code
- [IAC Patterns](docs/iac-patterns.md) - Infrastructure code patterns
- [System Tests](system-tests/README.md) - Integration tests for deployed services

## Package Catalog

The monorepo uses pnpm's catalog feature to manage consistent versions across packages:

- `react`: ^19.2.3
- `react-dom`: ^19.2.3
- `@types/react`: ^19.2.7
- `@types/react-dom`: ^19.2.3
- `typescript`: ^5.9.3
- `zod`: ^4.2.1

To use catalog versions in your package.json:

```json
{
  "dependencies": {
    "react": "catalog:",
    "zod": "catalog:"
  }
}
```

## Shared Configurations

### ESLint

The `config-eslint` package provides three configurations:

- `config-eslint` - Default TypeScript config
- `config-eslint/react` - React-specific config
- `config-eslint/tanstack` - TanStack Start config with React Router rules

Usage in `eslint.config.js`:

```js
import tanstackConfig from 'config-eslint/tanstack';
export default tanstackConfig;
```

### TypeScript

The `config-tsconfig` package provides base configurations:

- `config-tsconfig/base.json` - Base TypeScript config
- `config-tsconfig/react-library.json` - React library config
- `config-tsconfig/tanstack.json` - TanStack Start config

Usage in `tsconfig.json`:

```json
{
  "extends": "config-tsconfig/tanstack.json"
}
```

### UI Components

The `ui` package re-exports Chakra UI components and provides shared UI utilities. All Chakra UI dependencies are managed in the ui package, so services don't need to install Chakra directly.

Usage:

```tsx
import { Button, Box, Stack } from '@lib/ui';
```

### Internal API Contracts

The `contract-internal-api` package defines shared API contracts for type-safe inter-service communication using ORPC.

Usage:

```typescript
// In service implementation
import { implement } from '@orpc/server';
import { contract } from '@contract/internal-api/auth';

const getUser = implement(contract.user.get).handler(async ({ input }) => {
  return { id: input.id, email: 'user@example.com' };
});
```

See [Internal API Guide](docs/internal-api.md) for details.

## VS Code Setup

The repository includes VS Code configuration for optimal development experience:

- **Format on save**: Enabled with Prettier
- **ESLint auto-fix**: Runs on save
- **TypeScript**: Uses workspace version
- **Recommended extensions**: Prettier, ESLint

## Adding New Packages

1. Create a new directory in `packages/` or `services/`
2. Initialize with `package.json`
3. Use workspace protocol for internal dependencies: `"@lib/ui": "workspace:*"`
4. Use catalog for common dependencies: `"react": "catalog:"`

## Scripts Reference

| Command             | Description                                   |
| ------------------- | --------------------------------------------- |
| `pnpm install`      | Install all dependencies                      |
| `pnpm dev`          | Start development servers                     |
| `pnpm build`        | Build all packages and services               |
| `pnpm lint`         | Lint all packages                             |
| `pnpm type-check`   | Run TypeScript type checking                  |
| `pnpm format`       | Format code with Prettier                     |
| `pnpm clean`        | Clean all node_modules and build artifacts    |
| `pnpm test`         | Run unit tests (in specific package)          |
| `pnpm system-tests` | Run integration tests (requires --stage, AWS) |

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
- [Chakra UI Documentation](https://www.chakra-ui.com/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspace Catalogs](https://pnpm.io/catalogs)
- [pnpm Documentation](https://pnpm.io/)
- [ORPC Documentation](https://orpc.dev/docs/getting-started)
- [SST Documentation](https://docs.sst.dev/)

## Available AI Agents

This project includes specialized AI agents to assist with development tasks:

### IAC Test Writer (`@iac-test`)

Writes comprehensive unit tests for AWS infrastructure code using SST v2 and AWS CDK.

**Usage:**

```
@iac-test write tests for UserPool construct
```

**Resources:** See `.opencode/agent/iac-test.md` and `docs/iac-testing.md`

---

**Note for AI Agents**: Always consult `AGENTS.md` for project-specific coding standards, commands, and architectural patterns before making changes.
