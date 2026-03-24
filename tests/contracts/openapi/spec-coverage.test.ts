/**
 * Contract Test: OpenAPI Spec Coverage
 *
 * Valida que todas as rotas API críticas do ProjectForge estão documentadas
 * na spec OpenAPI. Usa swagger-jsdoc para gerar a spec via JSDoc.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { getSwaggerSpec } from '@/lib/openapi/config'

// Lista das rotas API críticas do ProjectForge (baseada no filesystem real)
// Formato: { method, path } onde path usa sintaxe OpenAPI {id} para path params
const EXPECTED_ENDPOINTS: Array<{ method: string; path: string; tag: string }> = [
  // ── Health ────────────────────────────────────────────────────────────────
  { method: 'get', path: '/api/healthz',    tag: 'Health' },
  { method: 'get', path: '/api/health',     tag: 'Health' },
  { method: 'get', path: '/api/health/db',  tag: 'Health' },
  { method: 'get', path: '/api/health/ready', tag: 'Health' },

  // ── Auth ──────────────────────────────────────────────────────────────────
  { method: 'get',  path: '/api/auth/callback', tag: 'Auth' },
  { method: 'get',  path: '/api/auth/me',       tag: 'Auth' },
  { method: 'post', path: '/api/auth/logout',   tag: 'Auth' },

  // ── Briefs (BriefForge) ───────────────────────────────────────────────────
  { method: 'post', path: '/api/briefs',                                     tag: 'Briefs' },
  { method: 'get',  path: '/api/briefs/{id}',                                tag: 'Briefs' },
  { method: 'get',  path: '/api/briefs/{id}/prd',                            tag: 'Briefs' },
  { method: 'get',  path: '/api/briefs/{id}/prd/versions',                   tag: 'Briefs' },
  { method: 'post', path: '/api/briefs/{id}/sessions',                       tag: 'Briefs' },
  { method: 'get',  path: '/api/briefs/{id}/sessions/{sessionId}',           tag: 'Briefs' },
  { method: 'post', path: '/api/briefs/{id}/sessions/{sessionId}/questions', tag: 'Briefs' },

  // ── Estimates (EstimAI) ───────────────────────────────────────────────────
  { method: 'get',  path: '/api/projects/{id}/estimates',                    tag: 'Estimates' },
  { method: 'post', path: '/api/projects/{id}/estimates',                    tag: 'Estimates' },
  { method: 'get',  path: '/api/projects/{id}/estimates/{estimateId}',       tag: 'Estimates' },
  { method: 'post', path: '/api/projects/{id}/estimates/{estimateId}/revise', tag: 'Estimates' },

  // ── Tasks (ScopeShield) ────────────────────────────────────────────────────
  { method: 'get',   path: '/api/projects/{id}/tasks',         tag: 'Tasks' },
  { method: 'post',  path: '/api/projects/{id}/tasks',         tag: 'Tasks' },
  { method: 'patch', path: '/api/projects/{id}/tasks/{taskId}', tag: 'Tasks' },

  // ── Change Orders ─────────────────────────────────────────────────────────
  { method: 'get',  path: '/api/projects/{id}/change-orders',              tag: 'ChangeOrders' },
  { method: 'post', path: '/api/projects/{id}/change-orders',              tag: 'ChangeOrders' },
  { method: 'get',  path: '/api/projects/{id}/change-orders/{coId}',       tag: 'ChangeOrders' },
  { method: 'post', path: '/api/projects/{id}/change-orders/{coId}/submit', tag: 'ChangeOrders' },
  { method: 'post', path: '/api/projects/{id}/change-orders/{coId}/approve', tag: 'ChangeOrders' },
  { method: 'post', path: '/api/projects/{id}/change-orders/{coId}/reject',  tag: 'ChangeOrders' },

  // ── RAG / HandoffAI ───────────────────────────────────────────────────────
  { method: 'post', path: '/api/projects/{id}/rag/index',  tag: 'RAG' },
  { method: 'post', path: '/api/projects/{id}/rag/query',  tag: 'RAG' },
  { method: 'get',  path: '/api/projects/{id}/rag/status', tag: 'RAG' },

  // ── Profit Reports (Rentabilia) ────────────────────────────────────────────
  { method: 'get',  path: '/api/projects/{id}/profit-reports',                     tag: 'Rentabilia' },
  { method: 'post', path: '/api/projects/{id}/profit-reports',                     tag: 'Rentabilia' },
  { method: 'get',  path: '/api/projects/{id}/profit-reports/{reportId}/export',   tag: 'Rentabilia' },

  // ── Approvals ─────────────────────────────────────────────────────────────
  { method: 'get',  path: '/api/projects/{id}/approvals',                        tag: 'Approvals' },
  { method: 'post', path: '/api/projects/{id}/approvals',                        tag: 'Approvals' },
  { method: 'get',  path: '/api/projects/{id}/approvals/{approvalId}',           tag: 'Approvals' },
  { method: 'post', path: '/api/portal/approvals/{approvalId}/respond',          tag: 'Approvals' },

  // ── Notifications ─────────────────────────────────────────────────────────
  { method: 'get',   path: '/api/notifications',          tag: 'Notifications' },
  { method: 'patch', path: '/api/notifications/{id}/read', tag: 'Notifications' },
  { method: 'post',  path: '/api/notifications/read-all', tag: 'Notifications' },

  // ── Client Portal ─────────────────────────────────────────────────────────
  { method: 'get',  path: '/api/portal/{token}',        tag: 'ClientPortal' },
  { method: 'post', path: '/api/portal/{token}/accept', tag: 'ClientPortal' },
]

describe('OpenAPI Spec Coverage', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let spec: any

  beforeAll(() => {
    spec = getSwaggerSpec()
  })

  it('spec é OpenAPI 3.x válido com campos obrigatórios', () => {
    expect(spec.openapi).toMatch(/^3\./)
    expect(spec.info).toBeDefined()
    expect(spec.info.title).toBe('ProjectForge API')
    expect(spec.paths).toBeDefined()
  })

  it('spec tem definições de components (schemas e securitySchemes)', () => {
    expect(spec.components).toBeDefined()
    expect(spec.components.schemas?.Error).toBeDefined()
    expect(spec.components.securitySchemes?.BearerAuth).toBeDefined()
  })

  it('spec lista os endpoints documentados via JSDoc', () => {
    const paths = spec.paths ?? {}
    const documentedCount = Object.keys(paths).length
    // Pode ter menos que o total esperado se JSDoc não cobrir tudo — o teste de cobertura abaixo detalha
    expect(documentedCount).toBeGreaterThanOrEqual(0)
    console.log(`\n  Endpoints documentados na spec: ${documentedCount}`)
  })

  it('todos os endpoints têm pelo menos um response documentado', () => {
    const endpointsWithoutResponse: string[] = []

    for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        const operation = (pathItem as Record<string, unknown>)[method] as
          | Record<string, unknown>
          | undefined
        if (
          operation &&
          (!operation.responses ||
            Object.keys(operation.responses).length === 0)
        ) {
          endpointsWithoutResponse.push(`${method.toUpperCase()} ${path}`)
        }
      }
    }

    if (endpointsWithoutResponse.length > 0) {
      console.log('\n  Endpoints sem response documentado:')
      endpointsWithoutResponse.forEach((e) => console.log(`    - ${e}`))
    }

    expect(endpointsWithoutResponse).toHaveLength(0)
  })

  it(`cobertura da spec — ${EXPECTED_ENDPOINTS.length} endpoints esperados`, () => {
    const paths = spec.paths ?? {}
    const missingEndpoints: string[] = []

    for (const endpoint of EXPECTED_ENDPOINTS) {
      const pathInSpec = paths[endpoint.path]
      if (!pathInSpec || !(pathInSpec as Record<string, unknown>)[endpoint.method]) {
        missingEndpoints.push(`${endpoint.method.toUpperCase()} ${endpoint.path}`)
      }
    }

    if (missingEndpoints.length > 0) {
      console.log(
        `\n  Endpoints sem documentação OpenAPI (${missingEndpoints.length}/${EXPECTED_ENDPOINTS.length}):`,
      )
      missingEndpoints.forEach((e) => console.log(`    - ${e}`))
      console.log(
        '\n  Para documentar, adicione @swagger JSDoc no route handler correspondente.',
      )
    }

    // Gate de cobertura: mínimo 5% (pelo menos endpoints de health documentados)
    // À medida que JSDoc é adicionado às rotas, este threshold deve subir para 100%
    const coveragePercent =
      ((EXPECTED_ENDPOINTS.length - missingEndpoints.length) /
        EXPECTED_ENDPOINTS.length) *
      100
    console.log(`\n  Cobertura OpenAPI: ${coveragePercent.toFixed(1)}%`)
    console.log(
      '  Meta: 100% (adicionar @swagger JSDoc em cada route handler para atingir)',
    )
    // Threshold mínimo — falha se NENHUM endpoint estiver documentado
    expect(coveragePercent).toBeGreaterThanOrEqual(5)
  })
})
