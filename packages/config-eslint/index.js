import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Default ESLint configuration for TypeScript projects
 * Provides base rules for JavaScript and TypeScript
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: ['dist', 'node_modules', 'build', 'coverage', '.turbo'],
  }
);
