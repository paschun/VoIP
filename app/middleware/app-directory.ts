import { env } from '../core/env.ts'
import { factory } from '../core/factory.ts'

// Security-through-obscurity gate for the SPA entry. The app is reachable only under a configured secret path segment
// (`APPDIRECTORY`); requests off it get a bare 404 (branded error page) so the login page can't be discovered. This is
// a server-side boundary -- a client redirect can't hide the HTML, which is the whole point.
//
// Two modes, distinguished by whether APPDIRECTORY is set (env keeps it optional for exactly this reason):
//  - unset  -> effective directory `voip`, and `/` redirects there (backward compat; top level stays reachable).
//  - set    -> no redirect; anything not under the directory 404s, revealing nothing.
//
// Only navigation (HTML) requests are gated. API, uploads, socket.io, and built asset files (which carry an extension)
// pass through untouched -- they don't carry the directory prefix and the API is separately JWT-protected.

const configured = env.APPDIRECTORY
const directory = (configured ?? 'voip').toLowerCase()
const redirectRoot = configured === undefined

/** True for requests that must never be gated: the API, uploads, socket.io, and any real asset file (has an extension). */
function isPassthrough(path: string): boolean {
  if (path.startsWith('/api/') || path.startsWith('/uploads/') || path.startsWith('/socket.io/')) return true
  // A dot in the last segment means a file with an extension -> an asset request, return true to passthrough
  return (path.split('/').pop() ?? '').includes('.')
}

/** Gate the SPA entry behind the configured directory segment. `errorPage` is served (404) for a wrong/absent segment. */
export function appDirectoryGate(errorPage: string) {
  return factory.createMiddleware(async (c, next) => {
    const path = c.req.path
    if (isPassthrough(path)) return next()
    // Leading `/` makes split index 0 empty, so [1] is the first real segment (the directory) -- the app is served here.
    // If the request path matches what is configured in env, allow them through
    if ((path.split('/')[1] ?? '').toLowerCase() === directory) return next()
    // Backward-compat courtesy: bounce only the bare top-level domain to the default directory. Don't redirect typos.
    if (redirectRoot && path === '/') return c.redirect(`/${directory}`)
    // fallback to 404
    return c.html(errorPage, 404)
  })
}
