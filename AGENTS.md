# Agent Guidelines for TanStack Start Monorepo

test

## Commands

- **Install**: `pnpm install` (requires Node.js >=22, pnpm >=10.26.2)
- **Dev**: `pnpm dev` (all services) or `cd services/main-ui && pnpm dev` (single service)
- **Build**: `pnpm build` (uses Turborepo, builds all packages/services including type check)
- **Lint**: `pnpm lint` (all) or `cd services/main-ui && pnpm lint` (single package)
- **Type Check**: `pnpm type-check` (all) or `cd services/main-ui && pnpm type-check` (single)
- **Format**: `pnpm format` (write), `pnpm format:check` (check only)
- **Test**: `cd services/main-ui && pnpm test` (watch mode), `pnpm test:run` (single run), `cd services/main-ui && vitest run src/path/to/file.test.tsx` (single file)

## Code Style

- **Imports**: Use `ui` package for ALL Chakra UI components (never import from @chakra-ui directly), `workspace:*` for internal deps, `catalog:` for shared versions (react, typescript, zod, vitest, @testing-library/\*)
- **Formatting**: Prettier enforced (single quotes, semicolons, 2-space indentation, 80 char printWidth, ES5 trailing commas)
- **Types**: Strict TypeScript with `strict: true`, `strictNullChecks: true`, no `any` (ESLint error), use Zod v4 for runtime validation
- **Naming**: PascalCase for components/types, camelCase for functions/variables, file-based routing for TanStack Router (`index.tsx`, `about.tsx` in `routes/`)
- **Components**: Use Chakra UI v3 composition pattern (`Component.Root`, `Component.Body`, etc.), all Chakra exports via `packages/ui/src/chakra.tsx`
- **Testing**: Use Vitest with jsdom, custom render function from `~/test/test-utils.tsx` wraps components in ChakraProvider, mock TanStack Router with `createRouter`/`createRoute` helpers
- **Error Handling**: ESLint warns on console (except console.warn/error), React 19 JSX transform (no React import needed)
- **File Structure**: `services/` for apps, `packages/` for shared libs, `~/*` alias maps to `src/` in services

## Project Context

TanStack Start (React 19) + Chakra UI v3 monorepo with Turborepo, pnpm workspaces, and Vite. Main frontend at `services/main-ui` with SSR via TanStack Start. Flat ESLint config extends @tanstack/eslint-config. Test setup uses Vitest 4.x with @testing-library/react 16.x.
