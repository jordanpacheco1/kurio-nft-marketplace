import { defineConfig } from 'vitest/config'

// Só testes unitários puros (money e regras do mock). Os E2E ficam no Playwright, em e2e/.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
