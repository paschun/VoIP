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
      // Migration shims intentionally use `any` (vuelidate, SDKs). Re-tighten later.
      '@typescript-eslint/no-explicit-any': 'off',
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
