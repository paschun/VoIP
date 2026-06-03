import { defineConfig } from 'vitest/config'

// Backend test suite. Scoped to the root `test/` dir so it never picks up the frontend workspace's own specs.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
