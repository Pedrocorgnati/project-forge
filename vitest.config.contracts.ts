import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * Configuração Vitest isolada para testes de contrato cross-módulo.
 * Timeout estendido (60s) — testes de integração com DB e Realtime.
 * Ambiente: node (não jsdom) — contratos são server-side.
 * Rodar com: npm run test:contracts:ci
 */
export default defineConfig({
  test: {
    include: ['tests/contracts/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/contracts/setup.ts'],
    reporters: ['verbose'],
    coverage: {
      include: [
        'src/lib/events/**/*.ts',
        'src/lib/openapi/**/*.ts',
        'src/app/api/**/*.ts',
      ],
      thresholds: {
        statements: 0, // contratos validam comportamento, não cobertura de linha
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // server-only throws in Node.js by default; tests run in Node, so remap to empty
      'server-only': resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
})
