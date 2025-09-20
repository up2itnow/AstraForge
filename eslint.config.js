import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      complexity: ['warn', 20],
      'max-lines-per-function': ['warn', 75],
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-undef': 'off', // TypeScript handles this
    },
  },
  {
    ignores: ['out/**', 'node_modules/**', 'temp_folder/**', 'coverage/**'],
  },
];
