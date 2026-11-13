import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// The Svelte plugin ships a parser setup for `*.svelte.ts` modules that clashes with
// the plain TypeScript parser those files already use, so only keep the `*.svelte`
// setup and let typescript-eslint handle `.svelte.ts`.
const svelteConfigs = svelte.configs['flat/recommended'].filter(
  (config) => !config.name?.includes('script'),
);

export default tseslint.config(
  {
    ignores: [
      'build/',
      '.svelte-kit/',
      'src/lib/paraglide/',
      'node_modules/',
      'out/',
      'scripts/',
      'static/',
      'coverage/',
      '.claude/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelteConfigs,
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,svelte}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly' },
    },
    rules: {
      // Deliberate in this codebase: catch blocks that just fall back, and rethrows
      // that keep the original error message without a `cause` chain.
      'no-empty': ['error', { allowEmptyCatch: true }],
      'preserve-caught-error': 'off',
      // Plain Maps/Sets are used deliberately outside reactive state.
      'svelte/prefer-svelte-reactivity': 'off',
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // Svelte 5 `$effect` blocks read values on purpose to track them, and the
      // navigation/each-key/reactivity rules would need a wide refactor.
      '@typescript-eslint/no-unused-expressions': 'off',
      'svelte/no-navigation-without-resolve': 'off',
      'svelte/require-each-key': 'off',
      'svelte/prefer-svelte-reactivity': 'off',
      'svelte/no-useless-mustaches': 'off',
    },
  },
  {
    // Dates, times and numbers go through src/lib/format/format.ts so they follow the
    // learner's "format like" setting; raw toLocale*String() would ignore it.
    files: ['src/**/*.{ts,svelte}'],
    ignores: ['src/lib/format/**'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]",
        message: 'Format dates, times and numbers with src/lib/format/format.ts.',
      }],
    },
  },
  {
    // Type-aware rules: a dropped promise hides its rejection, and a switch over a union must
    // handle every member (or say `default:` on purpose).
    files: ['src/**/*.{ts,svelte}', 'tests/**/*.ts', 'server/**/*.ts', 'api/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname, extraFileExtensions: ['.svelte'] },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
    },
  },
  {
    files: ['**/*.{ts,svelte}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
