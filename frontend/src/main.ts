import Vue from 'vue'

// Global plugins
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'
import Vuelidate from 'vuelidate'
import VueSweetalert2 from 'vue-sweetalert2'
import formLoading from 'vue2-form-loading'
import VueCookie from 'vue-cookie'
import VueMoment from 'vue-moment'
import ApiPlugin from '@/core/api.plugin'

// Global components
import vSelect from 'vue-select'
import InputTag from 'vue-input-tag'

// Global styles (order matters)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import 'vue-select/dist/vue-select.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import '@/assets/css/main.css'

import router from './router'
import App from './App.vue'

Vue.use(BootstrapVue)
Vue.use(IconsPlugin)
Vue.use(Vuelidate)
Vue.use(VueSweetalert2)
Vue.use(formLoading)
Vue.use(VueCookie)
Vue.use(VueMoment)
Vue.use(ApiPlugin)

Vue.component('v-select', vSelect)
Vue.component('input-tag', InputTag)

Vue.config.productionTip = false

new Vue({
  el: '#app',
  router,
  render: (h) => h(App) // https://v2.vuejs.org/v2/guide/installation.html#Runtime-Compiler-vs-Runtime-only
})
