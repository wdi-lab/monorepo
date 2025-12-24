import { tanstackConfig } from '@tanstack/eslint-config';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

/**
 * ESLint configuration for TanStack Start projects
 * Extends official @tanstack/eslint-config with React and TanStack Router specific rules
 */
export default [
  // Extend TanStack's official config
  ...tanstackConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React rules
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // React 17+ JSX transform - no need to import React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // We use TypeScript for prop validation

      // Override TanStack config for stricter type safety
      '@typescript-eslint/no-explicit-any': 'error',

      // TanStack Router specific
      // Allow Record<string, unknown> for search params (common in TanStack Router)
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Ignore common build/output directories
    ignores: ['dist', 'node_modules', '.output', 'build', 'coverage', '.turbo'],
  },
];
