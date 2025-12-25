import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * ESLint configuration for Node.js projects
 * Extends base config with Node.js-specific rules
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        exports: 'writable',
        global: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Node.js specific rules
      'no-console': 'off', // Allow console in Node.js
      'no-process-exit': 'warn', // Warn on process.exit()
    },
  },
  {
    ignores: ['dist', 'node_modules', 'build', 'coverage', '.turbo'],
  }
);
