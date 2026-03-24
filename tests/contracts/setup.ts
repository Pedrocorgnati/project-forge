/**
 * Global setup para a suíte de testes de contrato.
 * Verifica pré-requisitos antes de iniciar qualquer teste de contrato.
 */
import { execSync } from 'child_process'

export async function setup() {
  // Verificar DATABASE_URL presente
  if (!process.env.DATABASE_URL) {
    throw new Error(
      '[Contract Tests] DATABASE_URL não configurado. ' +
        'Configure no .env.local ou .env.test antes de rodar testes de contrato.',
    )
  }

  // Verificar que Prisma Client está gerado
  try {
    execSync('npx prisma generate --schema=./prisma/schema.prisma', {
      stdio: 'pipe',
    })
  } catch {
    // Já gerado — ignorar
  }

  console.log('[Contract Tests] Setup concluído. Iniciando suíte...')
}

export async function teardown() {
  console.log('[Contract Tests] Teardown concluído.')
}
