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
    files: ['**/*.{ts,vue}'],
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

      eqeqeq: ['error', 'always'],
      // Steer the global `isNaN`/`isFinite` to `Number.isNaN`/`Number.isFinite`, which don't coerce their argument.
      'no-restricted-globals': [
        'error',
        { name: 'isNaN', message: 'Use Number.isNaN instead.' },
        { name: 'isFinite', message: 'Use Number.isFinite instead.' },
      ],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error', // also in stylisticTypeChecked

      // Biome has useImportExtensions: https://biomejs.dev/linter/rules/use-import-extensions/
    },
  },

  {
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
