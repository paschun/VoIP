/**
 * Route-related helpers. Kept next to the route table (index.ts) because they
 * depend on its typed-route shapes.
 */

import type { RouteLocationNormalizedLoaded } from 'vue-router'

/**
 * Read the `appdirectory` route param as a plain string.
 *
 * With typed routes (see ./index.ts) `this.$route` is a union over every route,
 * so `this.$route.params.appdirectory` doesn't type-check directly (the `/`,
 * `/404`, catch-all routes have no such param). The `in` check narrows the
 * union — cast-free — to the routes that do, and returns `''` on the ones that
 * don't (e.g. the bare `/` that also renders Login).
 */
export function appDirectory(route: RouteLocationNormalizedLoaded): string {
  return 'appdirectory' in route.params ? route.params.appdirectory : ''
}
