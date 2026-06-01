import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next/resolvers'
import { browserslistToTargets } from 'lightningcss'
import browserslist from 'browserslist'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import pkg from './package.json' with { type: 'json' }

// Both use the `browserslist` field in package.json.
const cssTargets = browserslistToTargets(browserslist(pkg.browserslist))
const jsTargets = browserslistToEsbuild(pkg.browserslist)

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),

    // Auto-imports the icon components used in templates (`<i-bi-x />`) via the
    // IconsResolver; no manual per-icon import needed. Replaces bootstrap-vue's
    // `<b-icon icon="x">`. See unplugin-icons docs.
    Components({
      resolvers: [IconsResolver(), BootstrapVueNextResolver()],
      dts: 'src/components.d.ts', // this setting generates the file
    }),
    Icons({
      compiler: 'vue3',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // API contracts shared with the backend
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
    // An empty list disables extensionless resolution.
    extensions: [],
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: cssTargets,
    },
  },
  server: {
    host: 'localhost',
    port: 8080,
    strictPort: true,
    // Allow importing ../shared (above the Vite root) in dev.
    fs: { allow: ['..'] },
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    // Use `dist/static/...` layout so backend (`app.js`) routes that reference `/frontend/dist/static/` work.
    assetsDir: 'static',
    sourcemap: true,
    emptyOutDir: true,
    cssMinify: 'lightningcss',
    target: jsTargets,
  },
}) satisfies UserConfig
