import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

/**
 * Vitest config (added in chantier SEO for JSON-LD unit tests, part 4).
 * `@/…` resolves to the project root, matching tsconfig paths so tests import
 * the same way app code does. Node environment — the builders under test are
 * pure and need no DOM.
 */
export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
})
