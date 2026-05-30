import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/404',
      component: () => import('@/components/ErrorPage')
    },
    {
      path: '/',
      component: () => import('@/components/Login')
    },
    {
      path: '/:appdirectory',
      component: () => import('@/components/Login')
    },
    {
      path: '/:appdirectory/signup',
      component: () => import('@/components/Signup')
    },
    {
      path: '/:appdirectory/dashboard',
      component: () => import('@/components/Dashboard')
    },
    { path: '*', component: () => import('@/components/ErrorPage') }
  ]
})
