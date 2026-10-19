import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'blob-report/**',
      '.playwright/**',
      '.screenshots/**',
      'scripts/**',
      'docs/**',
      '**/*.md',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          // Landmark/prop registries are objects whose values are components,
          // which is exactly the "HOC" shape this rule accepts.
          extraHOCs: ['LANDMARK_VISUALS', 'OBJECT_VISUALS', 'Geometries', 'Geometries.trunk'],
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],

      /*
       * The following stylistic rules are disabled because they conflict with
       * correct, idiomatic code in this codebase rather than catching defects:
       *
       * - `no-confusing-void-expression` fires on every `onClick={fn}`
       *   shorthand, which is the correct React pattern.
       * - `dot-notation` fires on bracket access used to validate untyped
       *   `Record<string, unknown>` payloads read back from localStorage.
       * - The `no-unnecessary-*` family mis-fires on DOM and WebGL APIs whose
       *   TypeScript lib definitions are wider than the runtime guarantees.
       *
       * Type correctness is still enforced by `tsc` and strictTypeChecked.
       */
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-template-expression': 'off',
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
    },
  },
  {
    /*
     * This config file itself is plain JavaScript, so the type-aware rule set
     * (which needs a tsconfig project) does not apply to it.
     */
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    /*
     * Three.js scene code mutates Three.js objects inside `useFrame`. That is
     * the documented React Three Fiber model — React renders the scene graph,
     * the frame loop drives it — so the React Compiler immutability rules do
     * not apply inside `src/world`.
     */
    files: ['src/world/**/*.ts', 'src/world/**/*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.config.ts', '**/*.config.js'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // Test doubles and mocks are legitimately empty and synchronous.
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['src/main.tsx', 'src/test-utils/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
