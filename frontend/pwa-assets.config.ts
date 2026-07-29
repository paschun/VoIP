import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  // https://vite-pwa-org.netlify.app/assets-generator/cli.html#configurations
  preset: {
    transparent: { sizes: [192, 512], favicons: [[32, 'favicon.ico']] },
    maskable: { sizes: [512] },
    apple: { sizes: [180] },
  },
  images: ['public/chat-cat.svg'],
})
