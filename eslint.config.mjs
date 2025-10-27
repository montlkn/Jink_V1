import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('expo'),
  {
    languageOptions: {
      globals: {
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        TextEncoder: 'readonly',
        crypto: 'readonly',
        AbortController: 'readonly',
        self: 'readonly',
        Clipboard: 'readonly',
      },
    },
  },
  {
    files: ['src/components/three/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.{js,jsx,ts,tsx}', '**/?(*.)+(spec|test).[jt]s?(x)'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/*', 'app/**', 'app-example/**', 'apps/**', 'patches/**', 'supabase/functions/**'],
  },
];
