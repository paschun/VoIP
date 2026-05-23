import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import { browserslistToTargets } from 'lightningcss'
import browserslist from 'browserslist'
import browserslistToEsbuild from 'browserslist-to-esbuild'
import { fileURLToPath, URL } from 'node:url'
import pkg from './package.json' with { type: 'json' }

// Both use the `browserslist` field in package.json.
const cssTargets = browserslistToTargets(browserslist(pkg.browserslist))
const jsTargets = browserslistToEsbuild(pkg.browserslist)

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // twilio-client uses util.inherits and events.EventsEmitter
      // So npm packages with those names are installed as dependencies and vite is able to resolve them.
    },
    // Vue 2 SFC imports written without extensions (e.g. `import App from './App'`) still work because `.vue` is listed here.
    extensions: ['.mjs', '.js', '.json', '.vue'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // vuelidate 0.x branches on `process.env.BUILD` to pick its browser entry point.
    'process.env.BUILD': JSON.stringify('web'),
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
})
