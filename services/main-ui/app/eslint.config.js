import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import tanstackConfig from '@config/eslint/tanstack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  ...tanstackConfig,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
];
