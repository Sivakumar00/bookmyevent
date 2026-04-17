import { libraryConfig } from '@repo/eslint-config/library';
import tsParser from '@typescript-eslint/parser';

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      'apps/**',
      'packages/**',
      'dist/**',
      'node_modules/**',
      '.husky/**',
    ],
  },
  ...libraryConfig,
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
