import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/dist/**',
      '**/scratch/**',
      '**/output/**',
      '**/release-candidates/**',
      '**/.playwright-cli/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '*.config.*',
      '*.cjs'
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        browser: 'readonly',
        chrome: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AssignmentExpression[left.type="MemberExpression"][left.property.name=/^(innerHTML|outerHTML)$/]',
          message: 'Do not assign raw HTML in extension code.',
        },
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'Do not render untrusted HTML in extension UI.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.ts', 'tests/**/*.tsx'],
    languageOptions: { globals: globals.node },
  }
);
