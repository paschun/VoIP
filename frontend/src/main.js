import Vue from 'vue'
import App from './App.vue'
import router from './router'
import VueSweetalert2 from 'vue-sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import ApiPlugin from '@/core/api.plugin'
import VueChatScroll from 'vue-chat-scroll'
import formLoading from 'vue2-form-loading'
import vSelect from 'vue-select'
import VueCookie from 'vue-cookie'
import VueMoment from 'vue-moment'
Vue.use(ApiPlugin)
Vue.use(VueChatScroll)
Vue.component('v-select', vSelect)
Vue.use(formLoading)
Vue.use(VueCookie)
Vue.config.productionTip = false
Vue.use(VueSweetalert2)
Vue.use(VueMoment)

new Vue({
  el: '#app',
  router,
  render: (h) => h(App) // https://v2.vuejs.org/v2/guide/installation.html#Runtime-Compiler-vs-Runtime-only
})
