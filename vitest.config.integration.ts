import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * Configuração Vitest para testes de integração.
 *
 * Diferença da suíte de contratos:
 * - Requer banco de dados real (DATABASE_URL ou DATABASE_TEST_URL)
 * - Cria e limpa dados via Prisma em cada suite
 * - Não mocka o Prisma — mocka APENAS o módulo de auth
 *
 * Executar com: bun run test:integration
 *
 * ATENÇÃO: configure DATABASE_URL apontando para banco de TESTE separado.
 * NUNCA rode contra o banco de produção.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    globals: true,
    environment: 'node',
    // Execução sequencial — testes compartilham banco e não devem paralelizar
    sequence: { concurrent: false },
    globalSetup: ['./tests/integration/global-setup.ts'],
    setupFiles: ['./tests/integration/setup.ts'],
    reporters: ['verbose'],
    coverage: {
      include: [
        'src/actions/**/*.ts',
        'src/app/api/**/*.ts',
        'src/lib/**/*.ts',
      ],
      thresholds: {
        statements: 0, // integração valida comportamento, não cobertura de linha
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
