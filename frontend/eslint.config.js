import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**'],
  },
  js.configs.recommended,
  vue.configs['flat/vue2-essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
    },
  },
  {
    rules: {
      eqeqeq: ['error', 'always'],
      'no-shadow': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-array-constructor': 'error',
    },
  },
])
