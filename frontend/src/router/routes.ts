import { watch } from 'vue'
import { createRouter, createWebHistory, type NavigationGuardReturn, type RouteRecordInfo } from 'vue-router'
import { authToken, sessionActive } from '@/core/auth-token.ts'
import { useUserStore } from '@/stores/user.ts'

// Manually-typed route map (vue-router "typed routes"). Each entry pairs a route
// name with its path + raw params (what you pass to router.push) + normalized
// params (what you read from this.$route.params). Keep this in sync with the
// `routes` array below. Augmenting `TypesConfig` makes `this.$route`/`router.push`
// param-aware, so e.g. `appdirectory` reads as `string` instead of `string | string[]`.
export interface RouteNamedMap {
  root: RouteRecordInfo<'root', '/', Record<never, never>, Record<never, never>>
  login: RouteRecordInfo<'login', '/:appdirectory/', { appdirectory: string }, { appdirectory: string }>
  signup: RouteRecordInfo<'signup', '/:appdirectory/signup', { appdirectory: string }, { appdirectory: string }>
  // `number` is the open conversation's remote phone number; raw omit/'' clears it, normalized '' means none open
  dashboard: RouteRecordInfo<
    'dashboard',
    '/:appdirectory/dashboard/:number?',
    { appdirectory: string; number?: string },
    { appdirectory: string; number: string }
  >
  'not-found': RouteRecordInfo<'not-found', '/:pathMatch(.*)*', { pathMatch: string | string[] }, { pathMatch: string[] }>
}

declare module 'vue-router' {
  interface TypesConfig {
    RouteNamedMap: RouteNamedMap
  }
  interface RouteMeta {
    /** Route is behind the session gate below, so its views can assume a live session. */
    requiresAuth?: boolean
  }
}

const DashboardView = () => import('@/views/DashboardView.vue')

// dynamic imports for bundle splitting: https://router.vuejs.org/guide/advanced/lazy-loading.html
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // in dev, index.html is served by vite dev server on port 8080, so this is reachable
    // in prod, index.html is served by node.js backend, which has appdir gating, so this route is unreachable
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
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/:appdirectory/signup',
      name: 'signup',
      component: () => import('@/views/SignupView.vue'),
    },
    {
      path: '/:appdirectory/dashboard/:number?',
      name: 'dashboard',
      meta: { requiresAuth: true },
      component: DashboardView,
    },
    {
      // https://router.vuejs.org/guide/essentials/dynamic-matching.html#Catch-all-404-Not-found-Route
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/ErrorPage.vue'),
    },
  ],
})

// This session gate is what keeps a dead session from mounting the dashboard and fanning out a dozen requests that each 401.
router.beforeEach(async (to): Promise<NavigationGuardReturn> => {

  // special-case login
  if (to.name === 'login') {
    // local-only check, skip displaying the login page if we have a token
    if (sessionActive()) return { name: 'dashboard', params: to.params } // redirect from login to dashboard. beforeEach will run again and do a network check.
    return true // accept navigation to login
  }

  if (!to.meta.requiresAuth) return true

  // Dashboard is the only route behind the auth gate, so its chunk is fetched alongside the token validation probe instead of after it, in order to minimize render time.
  void DashboardView()
  void import('@/components/dashboard/DashboardBody.vue')
  const verified = await useUserStore().verifySession()
  if (verified) return true // server accepted the token, allow navigation to dashboard

  // If verifySession failed, redirect from dashboard to login.
  // Params are explicit for first-load case. Already-loaded redirects dont need explicit params.
  return { name: 'login', params: 'appdirectory' in to.params ? to.params : undefined } // `in` check is for typescript typed routes to be happy
})

// An emptied token -- logout, or a 401 killing the session -- is the one trigger for leaving a protected route, so
// every authenticated view unmounts together and no view has to race the redirect itself.
watch(authToken, (token) => {
  if (!token && router.currentRoute.value.meta.requiresAuth) void router.push({ name: 'login' })
})

export default router
