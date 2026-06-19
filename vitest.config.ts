import { defineConfig } from 'vitest/config'

// Backend test suite. Scoped to the root `test/` dir so it never picks up the frontend workspace's own specs.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // `config/env.ts` parses (and requires) these at import time; satisfy it for tests that pull in the route/auth graph.
    // The real DB connection is the in-memory server (test/helpers/mongo.ts) -- `DB` here only has to be a non-empty string.
    env: {
      DB: 'mongodb://127.0.0.1/test',
      BASE_URL: 'http://localhost:3000',
      COOKIE_KEY: 'test-cookie-key-at-least-32-bytes-long!!',
    },
  },
})
