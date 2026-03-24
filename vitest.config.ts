import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    pool: 'forks',
    exclude: ['node_modules', 'e2e/**'],
    // RESOLVED: DEBT-009
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
      exclude: [
        'node_modules/**',
        'e2e/**',
        '**/*.test.*',
        '**/*.spec.*',
        'prisma/**',
        'scripts/**',
        '**/*.d.ts',
        'src/test-setup.ts',
      ],
    },
    // @ts-expect-error — environmentMatchGlobs não está tipado em @vitest/config mas é suportado em runtime
    environmentMatchGlobs: [
      // Testes de componentes React usam jsdom
      ['src/**/*.test.tsx', 'jsdom'],
      // Testes de backend/service usam node
      ['src/**/*.test.ts', 'node'],
    ],
    // Fallback para testes sem match
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // server-only throws in Node.js by default; tests run in Node, so remap to empty
      'server-only': resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
})
