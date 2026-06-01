import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,vue}'],
  },

  globalIgnores(['dist/**', 'node_modules/**', 'public/**', 'src/components.d.ts']),

  pluginVue.configs['flat/essential'],
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
      // The type-aware `no-unsafe-*` family stays off for now — it fires on every
      // read off an `any`, which is noise until the boundaries above are typed.
      // Re-enable in the final strict pass.
      // '@typescript-eslint/no-unsafe-argument': 'off',
      // '@typescript-eslint/no-unsafe-assignment': 'off',
      // '@typescript-eslint/no-unsafe-call': 'off',
      // '@typescript-eslint/no-unsafe-member-access': 'off',
      // '@typescript-eslint/no-unsafe-return': 'off',

      eqeqeq: ['error', 'always'],
      // Steer the global `isNaN`/`isFinite` to `Number.isNaN`/`Number.isFinite`, which don't coerce their argument.
      'no-restricted-globals': ['error',
        { name: 'isNaN', message: 'Use Number.isNaN instead.' },
        { name: 'isFinite', message: 'Use Number.isFinite instead.' },
      ],
      '@typescript-eslint/no-shadow': 'error',
      "@typescript-eslint/prefer-optional-chain": "error" // also in stylisticTypeChecked

      // Biome has useImportExtensions: https://biomejs.dev/linter/rules/use-import-extensions/
    },
  },

  {
    // Vue Options API relies on fire-and-forget promises throughout (intentional,
    // per AGENTS.md): `this.$post(...).then(...)` without await, `this.$router.push()`,
    // `swal.fire()`, and async `@click` handlers. These type-aware rules conflict
    // with that documented convention, so they're relaxed for SFCs only.
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      // Vue auto-binds Options-API methods to the instance, so passing
      // `this.method` as a callback (EventBus.$on, addEventListener, …) is safe.
      '@typescript-eslint/unbound-method': 'off',
    },
  },
)
