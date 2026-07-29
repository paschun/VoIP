import { defineConfig, type Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  // https://vite-pwa-org.netlify.app/assets-generator/cli.html#configurations
  preset: {
    transparent: { sizes: [192, 512], favicons: [[32, 'favicon.ico']] },
    // default background is white for homescreen icons, replace with theme_color
    maskable: { sizes: [512], padding: 0.4, resizeOptions: { background: '#2e2e2e' } }, // default padding is 0.3
    apple: { sizes: [180], resizeOptions: { background: '#2e2e2e' } },
  } satisfies Preset,
  images: ['public/chat-cat.svg'],
})
