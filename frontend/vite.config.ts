import vue from '@vitejs/plugin-vue'
import { BootstrapVueNextResolver } from 'bootstrap-vue-next/resolvers'
import browserslist from 'browserslist'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { browserslistToTargets } from 'lightningcss'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import type { Plugin, UserConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import pkg from './package.json' with { type: 'json' }

// Both use the `browserslist` field in package.json.
const cssTargets = browserslistToTargets(browserslist(pkg.browserslist))
const jsTargets = browserslistToEsbuild(pkg.browserslist)

/**
 * Service worker requires HTTPS or we can add the header
 */
const serviceWorkerScope = (): Plugin => ({
  name: 'service-worker-scope',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.startsWith('/src/sw.ts')) res.setHeader('Service-Worker-Allowed', '/')
      next()
    })
  },
})

export default defineConfig({
  plugins: [
    serviceWorkerScope(),
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
    tsconfigPaths: true,
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
      // The backend generates the manifest under the app directory. A `^` key is matched as a RegExp, not a path
      // prefix: `[^/]+` is a run of non-slash chars, i.e. exactly one path segment, so it matches whatever
      // APPDIRECTORY is set to.
      '^/[^/]+/manifest\\.json$': { target: 'http://localhost:3000' },
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
    rolldownOptions: {
      // input keys declares independent module graphs. can be anything.
      // The key is what chunk.name matches in entryFileNames
      input: { main: 'index.html', sw: 'src/sw.ts' },
      output: {
        // The service worker must keep a stable root-level name: its scope derives from its path (a hashed
        // `/static/` name would only control `/static/`) and the client registers it by URL. Its imported chunks
        // stay hashed -- a changed hash rewrites the entry's import, which is what triggers the update check.
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'static/[name]-[hash].js'),
        // Rolldown inlines a single-importer module into its entry, which would fold the worker logic back into
        // `sw.js`; this group forces it out into a hashed chunk so the entry stays a byte-stable shell.
        codeSplitting: { groups: [{ name: 'sw-worker', test: /src\/sw-worker\.ts/ }] },
      },
    },
    // sourcemap: true,
    emptyOutDir: true,
    cssMinify: 'lightningcss',
    target: jsTargets,
  },
}) satisfies UserConfig
