import { createApp, watch } from 'vue'
// Global plugins
import { createPinia } from 'pinia'
// Global styles. main.css pulls the vendor stylesheets into a `vendor` cascade layer via @import, this is the single CSS entry point.
import '@/assets/css/main.css'
// Importing applies the persisted/OS color mode to <html> at startup, independent of where the theme toggle renders.
import { authToken } from '@/core/auth-token.ts'
import { disablePush } from '@/core/push.ts'
import { initThemeMetaSync } from '@/core/theme.ts'

import App from './App.vue'
import router from './router/routes.ts'

// Catch-all for sessions that end without going through the store, i.e. an expired token cleared by handle-error.
watch(authToken, (token) => {
  if (!token) void disablePush({ revokeOnServer: false })
})

// oxlint-disable-next-line typescript/no-unsafe-argument : a .vue module-resolution limitation in tsgolint
const app = createApp(App)

// Errors in Vue-tracked execution -- render, watchers, lifecycle hooks, and event handlers Vue invokes -- including
// async ones: Vue attaches a `.catch` to the promise a handler/hook/watcher returns, so a rejection that propagates
// up to that boundary (e.g. `async mounted() { await load() }`) lands here.
app.config.errorHandler = (err, _instance, info) => {
  const args = [`vue global error handler [${info}]:`, err]
  console.error(...args)
}

// Rejections that never reach such a Vue-invoked promise surface here instead -- fire-and-forget chains where an async
// call is left un-awaited somewhere up the stack (`mounted() { load() }`, or an inner call un-awaited inside an async
// handler), so the rejection is detached even if it awaits internally. Not strictly about await vs no-await.
window.addEventListener('unhandledrejection', (event) => {
  console.error('window.unhandledrejection', event.reason, event.promise)
})

const pinia = createPinia()
app.use(pinia)
app.use(router)
initThemeMetaSync()

app.mount('#app')
