# Agent Guidelines

## Project Overview

Monorepo for a full-stack application with:

- **Frontend**: TanStack Start (React 19, file-based routing)
- **Backend**: AWS Lambda via SST v2
- **Infrastructure**: SST v2 + AWS CDK for infrastructure as code (IAC). Resources are deployed to AWS
- **Inter-service communication**: ORPC (contract-first, type-safe RPC with AWS Signature V4)
- **Monorepo**: Turborepo + pnpm workspaces with catalog
- **Local dev/test**: Resources are deployed to AWS for testing in a ephemeral/preview stage

## Commands

- **Install**: `pnpm install` (requires Node.js >=22, pnpm >=10.26.2)
- **Dev**: `pnpm dev` (all services) or `cd services/main-ui/app && pnpm dev` (single service). **IMPORTANT**: For SST services (`services/auth`, `services/main-api`), running `pnpm dev` requires AWS credentials and will prompt for a stage name. Always ask the user for both the stage name and AWS credentials method (e.g., aws-vault profile) before running SST dev commands.
- **Build**: `pnpm build` (uses Turborepo, builds all packages/services including type check)
- **Deploy**: `cd services/main-ui && pnpm run deploy -- --stage <stage>` (SST deployment, use current branch for stage, requires AWS credentials)
- **Lint**: `pnpm lint` (all) or `cd services/main-ui/app && pnpm lint` (single package)
- **Type Check**: `pnpm type-check` (all) or `cd services/main-ui/app && pnpm type-check` (single)
- **Format**: `pnpm format` (write), `pnpm format:check` (check only)
- **Test**: `cd services/main-ui/app && pnpm test` (watch mode), `pnpm test:run` (single run), `vitest run src/path/to/file.test.tsx` (single file). **IMPORTANT**: When asked to write or run tests, always consult the relevant testing documentation first: `docs/iac-testing.md` for infrastructure/SST/CDK tests, or `docs/manual-testing.md` for browser/UI testing

## AWS Credentials

For SST services requiring AWS credentials, the user may use aws-vault or other credential methods. Always ask which AWS profile/method to use before running commands that require credentials.

## Additional Documentation

- **[Manual Browser Testing](docs/manual-testing.md)**: Guide for using Playwright MCP tools for interactive browser testing
- **[IAC Testing](docs/iac-testing.md)**: Infrastructure testing patterns and best practices for SST/CDK code
- **[Auth Documentation](docs/auth.md)**: Authentication implementation details
- **[IAC Patterns](docs/iac-patterns.md)**: Infrastructure as code patterns and conventions (CDK & SST v2)

## Code Style

- **Imports**: Use `@lib/ui` package for ALL Chakra UI components (never import from @chakra-ui directly), `workspace:*` for internal deps, `catalog:` for shared versions (react, typescript, zod, vitest, @testing-library/\*, @types/node, @types/aws-lambda). Import from `@lib/sst-constructs` for shared SST/infrastructure constructs (e.g: NitroSite, ServiceConfig), and `@lib/sst-constructs/node` for Node.js-specific code often used in Lambda function.
- **Formatting**: Prettier enforced (single quotes, semicolons, 2-space indentation, 80 char printWidth, ES5 trailing commas)
- **Types**: Strict TypeScript with `strict: true`, `strictNullChecks: true`, no `any` (ESLint error), use Zod v4 for runtime validation
- **Naming**: PascalCase for components/types, camelCase for functions/variables, file-based routing for TanStack Router (`index.tsx`, `about.tsx` in `routes/`)
- **Components**: Use Chakra UI v3 composition pattern (`Component.Root`, `Component.Body`, etc.), all Chakra exports via `packages/ui/src/chakra.tsx`
- **Testing**: Use Vitest with jsdom, custom render function from `~/test/test-utils.tsx` wraps components in ChakraProvider, mock TanStack Router with `createRouter`/`createRoute` helpers. For infrastructure/SST/CDK tests, refer to `docs/iac-testing.md` for comprehensive testing patterns and best practices.
- **Error Handling**: ESLint warns on console (except console.warn/error), React 19 JSX transform (no React import needed)
- **File Structure**: `services/` for apps, `packages/` for shared libs, `~/*` alias maps to `src/` in services. Service source code in `./app` or `./functions` subdirs, infrastructure code (SST, infra/) at service root
- **ESLint Configs**: Use `@config/eslint/tanstack` for TanStack Start apps, `@config/eslint/node` for Node.js services (like main-api), `@config/eslint/react` for React libraries

## Project Context

TanStack Start (React 19) + Chakra UI v3 monorepo with Turborepo, pnpm workspaces, and Vite. Main frontend at `services/main-ui` with SSR via TanStack Start + Nitro. Backend at `services/main-api` with SST + AWS Lambda. Flat ESLint config extends @tanstack/eslint-config. Test setup uses Vitest 4.x with @testing-library/react 16.x. Shared SST constructs (SsrSite, NitroSite) in `@lib/sst-constructs` (packages/sst-constructs).
