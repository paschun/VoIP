import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/404',
      component: () => import('@/components/ErrorPage.vue')
    },
    {
      path: '/',
      component: () => import('@/components/Login.vue')
    },
    {
      path: '/:appdirectory',
      component: () => import('@/components/Login.vue')
    },
    {
      path: '/:appdirectory/signup',
      component: () => import('@/components/Signup.vue')
    },
    {
      path: '/:appdirectory/dashboard',
      component: () => import('@/components/Dashboard.vue')
    },
    { path: '*', component: () => import('@/components/ErrorPage.vue') }
  ]
})
