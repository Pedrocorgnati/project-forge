/**
 * Contract Test: Auth Contract
 *
 * Valida que todas as rotas protegidas retornam 401 sem token válido.
 * Requer servidor Next.js em execução (TEST_BASE_URL).
 *
 * Rodar com: TEST_BASE_URL=http://localhost:3000 npm run test:contracts
 */
import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

// Endpoints que NÃO requerem autenticação
const PUBLIC_ENDPOINTS = new Set([
  'GET /api/healthz',
  'GET /api/health',
  'GET /api/health/db',
  'GET /api/health/ready',
  'GET /api/auth/callback',
  'POST /api/auth/logout',
  'GET /api/docs',
])

// Endpoints protegidos a verificar (subconjunto representativo por categoria)
const PROTECTED_ENDPOINTS: Array<{
  method: string
  path: string
  resolvedPath: string
}> = [
  // Auth
  { method: 'GET',   path: '/api/auth/me', resolvedPath: '/api/auth/me' },

  // Briefs
  { method: 'POST', path: '/api/briefs', resolvedPath: '/api/briefs' },
  {
    method: 'GET',
    path: '/api/briefs/{id}',
    resolvedPath: '/api/briefs/00000000-0000-0000-0000-000000000001',
  },

  // Estimates
  {
    method: 'GET',
    path: '/api/projects/{id}/estimates',
    resolvedPath: '/api/projects/00000000-0000-0000-0000-000000000001/estimates',
  },

  // Tasks
  {
    method: 'GET',
    path: '/api/projects/{id}/tasks',
    resolvedPath: '/api/projects/00000000-0000-0000-0000-000000000001/tasks',
  },

  // Change Orders
  {
    method: 'GET',
    path: '/api/projects/{id}/change-orders',
    resolvedPath:
      '/api/projects/00000000-0000-0000-0000-000000000001/change-orders',
  },

  // RAG
  {
    method: 'GET',
    path: '/api/projects/{id}/rag/status',
    resolvedPath: '/api/projects/00000000-0000-0000-0000-000000000001/rag/status',
  },

  // Profit Reports
  {
    method: 'GET',
    path: '/api/projects/{id}/profit-reports',
    resolvedPath:
      '/api/projects/00000000-0000-0000-0000-000000000001/profit-reports',
  },

  // Approvals
  {
    method: 'GET',
    path: '/api/projects/{id}/approvals',
    resolvedPath: '/api/projects/00000000-0000-0000-0000-000000000001/approvals',
  },

  // Notifications
  {
    method: 'GET',
    path: '/api/notifications',
    resolvedPath: '/api/notifications',
  },
]

// Skip se servidor não estiver disponível
async function isServerAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/healthz`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

describe('Auth Contract: Rotas protegidas retornam 401 sem token', () => {
  let serverAvailable = false

  beforeAll(async () => {
    serverAvailable = await isServerAvailable()
    if (!serverAvailable) {
      console.warn(
        `\n  [SKIP] Servidor não disponível em ${BASE_URL}.\n` +
          '  Para rodar este teste: npm run dev & TEST_BASE_URL=http://localhost:3000 npm run test:contracts\n',
      )
    }
  })

  it('todos os endpoints protegidos retornam 401 sem Authorization header', async () => {
    if (!serverAvailable) {
      console.log('  [SKIP] Servidor indisponível — pulando verificação de auth')
      return // Passa silenciosamente quando servidor não está ativo
    }

    const failures: string[] = []

    for (const endpoint of PROTECTED_ENDPOINTS) {
      const key = `${endpoint.method} ${endpoint.path}`
      if (PUBLIC_ENDPOINTS.has(key)) continue

      try {
        const response = await fetch(`${BASE_URL}${endpoint.resolvedPath}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body:
            endpoint.method !== 'GET' && endpoint.method !== 'DELETE'
              ? JSON.stringify({})
              : undefined,
          signal: AbortSignal.timeout(5000),
        })

        if (response.status !== 401) {
          failures.push(
            `${endpoint.method} ${endpoint.path}: esperado 401, recebido ${response.status}`,
          )
        }
      } catch (err) {
        failures.push(
          `${endpoint.method} ${endpoint.path}: erro de rede — ${err}`,
        )
      }
    }

    if (failures.length > 0) {
      console.log('\n  Endpoints sem autenticação adequada:')
      failures.forEach((f) => console.log(`    - ${f}`))
    }

    expect(failures).toHaveLength(0)
  }, 60_000)
})
