import { createRouter, createWebHistory, type RouteRecordInfo } from 'vue-router'

// Manually-typed route map (vue-router "typed routes"). Each entry pairs a route
// name with its path + raw params (what you pass to router.push) + normalized
// params (what you read from this.$route.params). Keep this in sync with the
// `routes` array below. Augmenting `TypesConfig` makes `this.$route`/`router.push`
// param-aware, so e.g. `appdirectory` reads as `string` instead of `string | string[]`.
export interface RouteNamedMap {
  error: RouteRecordInfo<'error', '/404', Record<never, never>, Record<never, never>>
  home: RouteRecordInfo<'home', '/', Record<never, never>, Record<never, never>>
  login: RouteRecordInfo<'login', '/:appdirectory', { appdirectory: string }, { appdirectory: string }>
  signup: RouteRecordInfo<'signup', '/:appdirectory/signup', { appdirectory: string }, { appdirectory: string }>
  dashboard: RouteRecordInfo<'dashboard', '/:appdirectory/dashboard', { appdirectory: string }, { appdirectory: string }>
  'not-found': RouteRecordInfo<'not-found', '/:pathMatch(.*)*', { pathMatch: string | string[] }, { pathMatch: string[] }>
}

declare module 'vue-router' {
  interface TypesConfig {
    RouteNamedMap: RouteNamedMap
  }
}

// dynamic imports for bundle splitting: https://router.vuejs.org/guide/advanced/lazy-loading.html
export default createRouter({
  history: createWebHistory(),
  routes: [
    // in dev, index.html is served by vite dev server on port 8080, so this is reachable
    // in prod, index.html is served by node.js, which has appdir gating, so this route is unreachable
    {
      path: '/',
      name: 'root',
      redirect: '/voip/',
    },
    // the client routing is directory-agnostic. the first directory is treated as :appdirectory
    {
      path: '/:appdirectory/',
      name: 'login',
      strict: true, // we know its appdir and not a typo when it has a trailing slash
      component: () => import('@/components/Login.vue'),
    },
    {
      path: '/:appdirectory/signup',
      name: 'signup',
      component: () => import('@/components/Signup.vue'),
    },
    {
      path: '/:appdirectory/dashboard',
      name: 'dashboard',
      component: () => import('@/components/Dashboard.vue'),
    },
    {
      // https://router.vuejs.org/guide/essentials/dynamic-matching.html#Catch-all-404-Not-found-Route
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/components/ErrorPage.vue'),
    },
  ],
})
