import { createApp } from 'vue'

// Global plugins
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next/plugins/createBootstrap'
import VueSweetalert2 from 'vue-sweetalert2'
import ApiPlugin from '@/core/api.plugin.ts'
import { notifyError } from '@/notify.ts'

// Global styles (order matters)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import 'vue3-select-component/dist/styles.css'
import '@/assets/css/main.css'

import router from './router/index.ts'
import App from './App.vue'

const app = createApp(App)

/**
 * Last-resort net for *unexpected* errors -- programming bugs and unforeseen throws, NOT the modeled API-failure path.
 * Kept tiny + idempotent so the two sources below can't escalate a single fault into a wall of dialogs.
 */
const reportUnexpectedError = (err: unknown, context: string) => {
  console.error(`[unexpected:${context}]`, err)
  void notifyError(String(err), `[unexpected:${context}]`)
}

// Errors in Vue-tracked execution -- render, watchers, lifecycle hooks, and event handlers Vue invokes -- including
// async ones: Vue attaches a `.catch` to the promise a handler/hook/watcher returns, so a rejection that propagates
// up to that boundary (e.g. `async mounted() { await load() }`) lands here.
app.config.errorHandler = (err, _instance, info) => reportUnexpectedError(err, info)

// Rejections that never reach such a Vue-invoked promise surface here instead -- fire-and-forget chains where an async
// call is left un-awaited somewhere up the stack (`mounted() { load() }`, or an inner call un-awaited inside an async
// handler), so the rejection is detached even if it awaits internally. Not strictly about await vs no-await.
window.addEventListener('unhandledrejection', (event) => reportUnexpectedError(event.reason, 'unhandledrejection'))

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(createBootstrap())
app.use(VueSweetalert2)
app.use(ApiPlugin)

app.mount('#app')
