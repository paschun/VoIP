import { createApp } from 'vue'
import { createBootstrap } from 'bootstrap-vue-next/plugins/createBootstrap'
// Global plugins
import { createPinia } from 'pinia'
// Global styles. main.css pulls the vendor stylesheets into a `vendor` cascade layer via @import, so app rules
// override them without !important; keep it the single CSS entry point.
import '@/assets/css/main.css'

import App from './App.vue'
import router from './router/routes.ts'

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
app.use(createBootstrap())

app.mount('#app')
