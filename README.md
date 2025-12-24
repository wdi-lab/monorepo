# TanStack Start Monorepo

A modern, full-stack monorepo powered by [TanStack Start](https://tanstack.com/start), [Turborepo](https://turbo.build/repo), and [pnpm](https://pnpm.io/).

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

## Structure

```
.
├── services/
│   └── main-ui/              # TanStack Start application
├── packages/
│   ├── ui/                   # Shared UI components (Chakra UI)
│   ├── config-eslint/        # Shared ESLint configurations
│   │   ├── index.js          # Default TypeScript config
│   │   ├── react.js          # React-specific config
│   │   └── tanstack.js       # TanStack Start config
│   └── config-tsconfig/      # Shared TypeScript configurations
│       ├── base.json         # Base TypeScript config
│       ├── react-library.json # React library config
│       └── tanstack.json     # TanStack Start config
└── .vscode/                  # VS Code workspace settings
    ├── settings.json         # Editor settings (format on save)
    └── extensions.json       # Recommended extensions
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
import { Button, Box, Stack } from 'ui';
```

## VS Code Setup

The repository includes VS Code configuration for optimal development experience:

- **Format on save**: Enabled with Prettier
- **ESLint auto-fix**: Runs on save
- **TypeScript**: Uses workspace version
- **Recommended extensions**: Prettier, ESLint

## Adding New Packages

1. Create a new directory in `packages/` or `services/`
2. Initialize with `package.json`
3. Use workspace protocol for internal dependencies: `"ui": "workspace:*"`
4. Use catalog for common dependencies: `"react": "catalog:"`

## Scripts Reference

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm install`    | Install all dependencies                   |
| `pnpm dev`        | Start development servers                  |
| `pnpm build`      | Build all packages and services            |
| `pnpm lint`       | Lint all packages                          |
| `pnpm type-check` | Run TypeScript type checking               |
| `pnpm format`     | Format code with Prettier                  |
| `pnpm clean`      | Clean all node_modules and build artifacts |

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
- [Chakra UI Documentation](https://www.chakra-ui.com/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspace Catalogs](https://pnpm.io/catalogs)
- [pnpm Documentation](https://pnpm.io/)
