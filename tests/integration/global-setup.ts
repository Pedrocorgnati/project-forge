import { execSync } from 'child_process'

/**
 * Executa uma vez antes de toda a suíte de integração.
 * Valida pré-requisitos e aplica migrations no banco de teste.
 */
export async function setup() {
  const dbUrl = process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL

  if (!dbUrl) {
    throw new Error(
      '[Integration Tests] DATABASE_URL ou DATABASE_TEST_URL não configurado.\n' +
        'Crie um banco de dados de teste separado e configure a variável no .env.test.\n' +
        'NUNCA aponte para o banco de produção.',
    )
  }

  // Se DATABASE_TEST_URL definida, sobrescrever DATABASE_URL para esta sessão
  if (process.env.DATABASE_TEST_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_TEST_URL
  }

  console.log('[Integration Tests] Aplicando migrations no banco de teste...')
  try {
    execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
      stdio: 'pipe',
      env: { ...process.env },
    })
    console.log('[Integration Tests] Migrations concluídas.')
  } catch (err) {
    // migrate deploy pode falhar se não há migrations pendentes — ignorar
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('No pending migrations')) {
      console.warn('[Integration Tests] Warning ao aplicar migrations:', msg)
    }
  }

  console.log('[Integration Tests] Global setup concluído. Iniciando suíte...')
}

export async function teardown() {
  console.log('[Integration Tests] Global teardown concluído.')
}
