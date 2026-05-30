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
      },
    },
  }, {
    rules: {
      // The migration intentionally uses `any` at untyped boundaries (vuelidate,
      // the telephony SDKs, the untyped JSON REST layer, recursive WebAuthn
      // JSON). `no-explicit-any` plus the type-aware `no-unsafe-*` family (which
      // v8 bundles into recommended/recommendedTypeChecked) are off for now and
      // get re-enabled in the final strict pass. Every other type-aware rule
      // (no-floating-promises, no-misused-promises, await-thenable, …) stays on.
      '@typescript-eslint/no-explicit-any': 'off',
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
