import { createApp } from 'vue'

// Global plugins
import { createBootstrap } from 'bootstrap-vue-next/plugins/createBootstrap'
import VueSweetalert2 from 'vue-sweetalert2'
import ApiPlugin from '@/core/api.plugin.ts'

// Global styles (order matters)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import 'vue3-select-component/dist/styles.css'
import '@/assets/css/main.css'

import router from './router/index.ts'
import App from './App.vue'

const app = createApp(App)

app.use(router)
app.use(createBootstrap())
app.use(VueSweetalert2)
app.use(ApiPlugin)

app.mount('#app')
