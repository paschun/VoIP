import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,vue}'],
  },

  globalIgnores(['dist/**', 'node_modules/**', 'public/**', 'src/components.d.ts']),

  pluginVue.configs['flat/recommended'],
  // This wires vue-eslint-parser + the TS sub-parser for `<script lang="ts">` SFCs.
  vueTsConfigs.recommendedTypeChecked,

  {
    name: 'languageOptions and globals/',
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  {
    name: 'custom ts and vue/',
    files: ['**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-shadow': 'error',

      // Biome has useImportExtensions: https://biomejs.dev/linter/rules/use-import-extensions/
    },
  },

  {
    name: 'custom vue/',
    files: ['**/*.vue'],
    rules: {
      'vue/html-self-closing': ['error', { html: { void: 'never', normal: 'never', component: 'any' } }],
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
    },
  },
)
