import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next/resolvers'
import browserslist from 'browserslist'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { browserslistToTargets } from 'lightningcss'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import type { UserConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import pkg from './package.json' with { type: 'json' }

// Both use the `browserslist` field in package.json.
const cssTargets = browserslistToTargets(browserslist(pkg.browserslist))
const jsTargets = browserslistToEsbuild(pkg.browserslist)

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools({ launchEditor: 'codium' }),

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
    // Dev runs same-origin like prod: /api (including the /api/ws websocket upgrade) is proxied to the backend on
    // :3000 (`preview.proxy` defaults to this too), so no cross-origin handling exists anywhere in the app.
    proxy: {
      '/api': { target: 'http://localhost:3000', ws: true },
    },
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
