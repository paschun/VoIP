/**
 * PWA manifest for the SPA, built per-deploy so `start_url` lands on `appDir` (the configured entry segment)
 * instead of a build-time constant.
 */
export const webManifest = (appDir: string) => ({
  name: 'VoIP Suite NG',
  short_name: 'VoIP Suite',
  icons: [
    { src: '/pwa-192x192.png', type: 'image/png', sizes: '192x192' },
    { src: '/maskable-icon-512x512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    { src: '/pwa-512x512.png', type: 'image/png', sizes: '512x512' },
  ],
  scope: '/',
  start_url: `/${appDir}/`,
  background_color: '#2e2e2e',
  theme_color: '#2e2e2e',
  display: 'standalone',
  description: 'VoIP Suite Web App',
})
