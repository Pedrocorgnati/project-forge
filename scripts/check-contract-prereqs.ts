/**
 * Verifica pré-requisitos mínimos para testes de contrato do module-19.
 * Executar antes de rodar test:contracts:ci.
 *
 * Usage: npx tsx scripts/check-contract-prereqs.ts
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface Check {
  name: string
  fn: () => boolean
  critical: boolean
}

const ROOT = process.cwd()

const checks: Check[] = [
  // ── Schema Prisma ────────────────────────────────────────────────
  {
    name: 'Prisma schema existe (module-1)',
    fn: () => fs.existsSync(path.join(ROOT, 'prisma/schema.prisma')),
    critical: true,
  },
  {
    name: 'Prisma validate passa (module-1)',
    fn: () => {
      try {
        execSync('npx prisma validate', { stdio: 'pipe' })
        return true
      } catch {
        return false
      }
    },
    critical: true,
  },

  // ── RBAC (module-3) ───────────────────────────────────────────────
  {
    name: 'ROLE_PERMISSIONS existe em src/lib/rbac/constants.ts (module-3)',
    fn: () => fs.existsSync(path.join(ROOT, 'src/lib/rbac/constants.ts')),
    critical: true,
  },
  {
    name: 'Middleware de RBAC existe (module-3)',
    fn: () => {
      const paths = [
        'src/lib/rbac/permissions.ts',
        'src/lib/rbac/middleware.ts',
        'src/middleware.ts',
      ]
      return paths.some((p) => fs.existsSync(path.join(ROOT, p)))
    },
    critical: true,
  },

  // ── EventBus (module-4) ────────────────────────────────────────────
  {
    name: 'EventBus existe em src/lib/events/bus.ts (module-4)',
    fn: () => fs.existsSync(path.join(ROOT, 'src/lib/events/bus.ts')),
    critical: true,
  },
  {
    name: 'EventTypes definidos em src/lib/constants/events.ts (module-4)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'src/lib/constants/events.ts')),
    critical: true,
  },
  {
    name: 'Handler registry existe em src/lib/events/handlers/index.ts (module-4)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'src/lib/events/handlers/index.ts')),
    critical: true,
  },

  // ── Swagger / OpenAPI deps (ST001 de TASK-0) ──────────────────────
  {
    name: 'swagger-jsdoc instalado (ST001)',
    fn: () => {
      try {
        require.resolve('swagger-jsdoc')
        return true
      } catch {
        return false
      }
    },
    critical: true,
  },
  {
    name: '@apidevtools/swagger-parser instalado (ST001)',
    fn: () => {
      try {
        require.resolve('@apidevtools/swagger-parser')
        return true
      } catch {
        return false
      }
    },
    critical: true,
  },
  {
    name: 'pg instalado (ST001)',
    fn: () => {
      try {
        require.resolve('pg')
        return true
      } catch {
        return false
      }
    },
    critical: true,
  },

  // ── Rotas API críticas ────────────────────────────────────────────
  {
    name: 'Rota /api/projects existe (module-2)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'src/app/api/projects/route.ts')),
    critical: false,
  },
  {
    name: 'Rota /api/briefs existe (module-5)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'src/app/api/briefs/route.ts')) ||
      fs.existsSync(path.join(ROOT, 'src/app/api/briefs')) ||
      fs.existsSync(path.join(ROOT, 'src/app/api/briefs/sessions/route.ts')),
    critical: false,
  },
  {
    name: 'Rota /api/healthz existe (healthcheck)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'src/app/api/healthz/route.ts')),
    critical: false,
  },

  // ── Estrutura de testes de contrato ───────────────────────────────
  {
    name: 'tests/contracts/openapi/ existe (ST002)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'tests/contracts/openapi')),
    critical: true,
  },
  {
    name: 'tests/contracts/eventbus/ existe (ST002)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'tests/contracts/eventbus')),
    critical: true,
  },
  {
    name: 'tests/contracts/rbac/ existe (ST002)',
    fn: () => fs.existsSync(path.join(ROOT, 'tests/contracts/rbac')),
    critical: true,
  },
  {
    name: 'tests/contracts/immutability/ existe (ST002)',
    fn: () =>
      fs.existsSync(path.join(ROOT, 'tests/contracts/immutability')),
    critical: true,
  },

  // ── Environment ────────────────────────────────────────────────────
  {
    name: 'DATABASE_URL configurada',
    fn: () => Boolean(process.env.DATABASE_URL),
    critical: true,
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL configurada (para testes Realtime)',
    fn: () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    critical: false,
  },
]

async function runChecks() {
  console.log(
    '\n Verificando pré-requisitos para module-19-contract-testing...\n',
  )

  let passed = 0
  let failed = 0
  let warnings = 0
  const criticalFailures: string[] = []

  for (const check of checks) {
    try {
      const result = check.fn()
      if (result) {
        console.log(`  OK  ${check.name}`)
        passed++
      } else {
        if (check.critical) {
          console.log(`  FAIL  ${check.name} [CRITICO]`)
          criticalFailures.push(check.name)
          failed++
        } else {
          console.log(`  WARN  ${check.name} [AVISO]`)
          warnings++
        }
      }
    } catch (error) {
      console.log(`  FAIL  ${check.name} [ERRO: ${error}]`)
      if (check.critical) {
        criticalFailures.push(check.name)
        failed++
      }
    }
  }

  console.log('\n--------------------------------------------')
  console.log(
    `  Resultado: ${passed} OK | ${warnings} avisos | ${failed} criticos`,
  )

  if (criticalFailures.length > 0) {
    console.log('\n  Falhas criticas (test:contracts:ci nao pode iniciar):')
    criticalFailures.forEach((f) => console.log(`    - ${f}`))
    console.log(
      '\n  Complete os pre-requisitos antes de continuar.\n',
    )
    process.exit(1)
  } else {
    console.log(
      '\n  All prerequisites satisfied. Pronto para test:contracts:ci.\n',
    )
    process.exit(0)
  }
}

runChecks()
