// @ts-check

import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        // Required so the type-aware project service can load `<script lang="ts">` SFCs.
        extraFileExtensions: ['.vue'],
      },
    },
  }, {
    rules: {
      // The migration still uses escape hatches at untyped boundaries (vuelidate,
      // the telephony SDKs, the untyped JSON REST layer, recursive WebAuthn JSON,
      // DOM lookups). These three are surfaced as **warnings** so they stay
      // visible and shrink over time — do not silence them, type the boundary
      // instead (prefer a `@shared/api-contracts` type or an SDK's own types).
      '@typescript-eslint/no-explicit-any': 'warn', // `: any`, `as any`, `any[]`
      '@typescript-eslint/no-non-null-assertion': 'warn', // `foo!`
      // Flags every `as` cast (assertionStyle 'never' disallows all assertions).
      '@typescript-eslint/consistent-type-assertions': ['warn', { assertionStyle: 'never' }],
      // The type-aware `no-unsafe-*` family (bundled into recommendedTypeChecked)
      // stays off for now — it fires on every read off an `any`, which is noise
      // until the boundaries above are typed. Re-enable in the final strict pass.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  vue.configs['flat/vue2-essential'],
  {
    // Parse `<script lang="ts">` blocks in SFCs (vue-eslint-parser stays the
    // top-level parser; this just sets the script sub-parser).
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      // Vue 2 Options API relies on fire-and-forget promises throughout
      // (intentional, per AGENTS.md): `this.$post(...).then(...)` without await,
      // `this.$router.push()`, `swal.fire()`, and async `@click` handlers. These
      // two type-aware rules directly conflict with that documented convention,
      // so they are relaxed for SFCs only (both stay on for plain `.ts`).
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      // Vue 2 auto-binds Options-API methods to the instance, so passing
      // `this.method` as a callback (EventBus.$on, addEventListener, …) is safe.
      // `unbound-method` doesn't know that, so it's a false positive in SFCs.
      '@typescript-eslint/unbound-method': 'off',
    },
  }, {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  }, {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-shadow': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-array-constructor': 'error',
    },
  },
])
