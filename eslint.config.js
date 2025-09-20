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
      'max-lines-per-function': ['warn', 50],
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': 'off', // Temporarily disabled for interface requirements
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-unused-vars': 'off', // Disable base rule in favor of TS-aware check
      'no-case-declarations': 'off', // Allow scoped declarations inside switch cases
      'no-control-regex': 'off', // Allow validation of control characters when needed
      'no-useless-escape': 'off', // Allow explicit escaping for readability in complex regex
      'no-undef': 'off', // TypeScript handles this
    },
  },
  {
    ignores: ['out/**', 'node_modules/**', 'temp_folder/**', 'coverage/**'],
  },
];
