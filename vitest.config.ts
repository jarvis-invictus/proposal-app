import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // tests/e2e/** are Playwright specs (@playwright/test's test/expect, not Vitest's) — without
    // this, Vitest's default include pattern picks them up too and fails trying to run them.
    //
    // scripts/test-extraction.test.ts and scripts/test-proposal-gen.test.ts are excluded from the
    // default run (still runnable directly, e.g. `npx vitest run scripts/test-extraction.test.ts`)
    // because they make real, billed calls to Firecrawl/OpenAI with live API keys and near-zero
    // assertions — exploratory scripts that happen to use vitest's runner, not CI-safe regression
    // tests. Wiring them into `npm test`/CI as-is would make the gate either permanently red
    // (whenever the shared key expires, unrelated to any given PR) or silently cost real money on
    // every run — neither is what a CI gate is for.
    exclude: [
      '**/node_modules/**',
      '**/tests/e2e/**',
      '**/scripts/test-extraction.test.ts',
      '**/scripts/test-proposal-gen.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
