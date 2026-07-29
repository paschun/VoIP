import { defineConfig, type Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  // https://vite-pwa-org.netlify.app/assets-generator/cli.html#configurations
  preset: {
    transparent: { sizes: [192, 512], favicons: [[32, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0.4 }, // default padding is 0.3
    apple: { sizes: [180] },
  } satisfies Preset,
  images: ['public/chat-cat.svg'],
})
