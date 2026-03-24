/**
 * Contract Test: EventBus EventType Payload Shape
 *
 * Valida que cada EventType produz um registro `Event` com payload correto
 * ao ser publicado via EventBus.publish().
 *
 * REQUER banco de dados real com projeto seed.
 * Skip automático se DATABASE_URL não estiver configurada.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EventType } from '@/lib/constants/events'

// Skip todos os testes se DATABASE_URL não estiver configurada
const hasDb = Boolean(process.env.DATABASE_URL)

/**
 * Definição dos EventTypes com payload mínimo válido.
 * Adaptado aos EventPayloadMap reais do workspace.
 * projectId é injetado pela factory de teste.
 */
const EVENT_FIXTURES: Array<{
  type: string
  getData: (projectId: string) => Record<string, unknown>
  requiredPayloadFields: string[]
}> = [
  // ── BriefForge ────────────────────────────────────────────────────────────
  {
    type: EventType.BRIEF_SESSION_STARTED,
    getData: (projectId) => ({ sessionId: 'test-session-contract', projectId, userId: 'test-user-contract' }),
    requiredPayloadFields: ['sessionId', 'projectId', 'userId'],
  },
  {
    type: EventType.BRIEF_SESSION_PAUSED,
    getData: (projectId) => ({ sessionId: 'test-session-contract', projectId }),
    requiredPayloadFields: ['sessionId', 'projectId'],
  },
  {
    type: EventType.BRIEF_SESSION_COMPLETED,
    getData: (projectId) => ({ sessionId: 'test-session-contract', projectId }),
    requiredPayloadFields: ['sessionId', 'projectId'],
  },
  {
    type: EventType.BRIEF_PRD_GENERATED,
    getData: (projectId) => ({
      projectId,
      prdVersion: 1,
      briefId: 'test-brief-contract',
      prdDocumentId: 'test-prd-contract',
      generatedBy: 'test-user-contract',
    }),
    requiredPayloadFields: ['projectId', 'prdVersion', 'briefId', 'prdDocumentId', 'generatedBy'],
  },
  {
    type: EventType.BRIEF_PRD_APPROVED,
    getData: (projectId) => ({ projectId, approvedBy: 'test-user-contract', prdVersion: 1 }),
    requiredPayloadFields: ['projectId', 'approvedBy', 'prdVersion'],
  },
  {
    type: EventType.BRIEF_PRD_REJECTED,
    getData: (projectId) => ({ projectId, rejectedBy: 'test-user-contract', reason: 'Teste de contrato' }),
    requiredPayloadFields: ['projectId', 'rejectedBy', 'reason'],
  },
  {
    type: EventType.BRIEF_CREATED,
    getData: (projectId) => ({ projectId, briefId: 'test-brief-contract' }),
    requiredPayloadFields: ['projectId', 'briefId'],
  },

  // ── EstimAI ────────────────────────────────────────────────────────────────
  {
    type: EventType.ESTIMATE_CREATED,
    getData: (projectId) => ({ projectId, estimateId: 'test-estimate-contract', totalHours: 100 }),
    requiredPayloadFields: ['projectId', 'estimateId', 'totalHours'],
  },
  {
    type: EventType.ESTIMATE_APPROVED,
    getData: (projectId) => ({ projectId, estimateId: 'test-estimate-contract', approvedBy: 'test-user-contract' }),
    requiredPayloadFields: ['projectId', 'estimateId', 'approvedBy'],
  },
  {
    type: EventType.ESTIMATE_REVISED,
    getData: (projectId) => ({
      projectId,
      previousEstimateId: 'test-prev-estimate',
      newEstimateId: 'test-new-estimate',
      reason: 'Ajuste de escopo',
    }),
    requiredPayloadFields: ['projectId', 'previousEstimateId', 'newEstimateId', 'reason'],
  },

  // ── ScopeShield Tasks ──────────────────────────────────────────────────────
  {
    type: EventType.TASK_CREATED,
    getData: (_projectId) => ({ taskId: 'test-task-contract', createdBy: 'test-user-contract' }),
    requiredPayloadFields: ['taskId', 'createdBy'],
  },
  {
    type: EventType.TASK_UPDATED,
    getData: (_projectId) => ({ taskId: 'test-task-contract', updatedBy: 'test-user-contract', changes: { status: 'DONE' } }),
    requiredPayloadFields: ['taskId', 'updatedBy', 'changes'],
  },
  {
    type: EventType.TASK_STATUS_CHANGED,
    getData: (_projectId) => ({ taskId: 'test-task-contract', from: 'TODO', to: 'IN_PROGRESS', changedBy: 'test-user-contract' }),
    requiredPayloadFields: ['taskId', 'from', 'to', 'changedBy'],
  },

  // ── ScopeShield Alertas ────────────────────────────────────────────────────
  {
    type: EventType.SCOPE_ALERT_TRIGGERED,
    getData: (projectId) => ({ projectId, deviation: 15.5, taskId: 'test-task-contract' }),
    requiredPayloadFields: ['projectId', 'deviation', 'taskId'],
  },
  {
    type: EventType.SCOPE_ALERT_CREATED,
    getData: (projectId) => ({
      projectId,
      alertId: 'test-alert-contract',
      taskId: 'test-task-contract',
      type: 'DEVIATION',
      severity: 'HIGH',
    }),
    requiredPayloadFields: ['projectId', 'alertId', 'taskId', 'type', 'severity'],
  },

  // ── Change Orders ──────────────────────────────────────────────────────────
  {
    type: EventType.CHANGE_ORDER_CREATED,
    getData: (projectId) => ({ projectId, changeOrderId: 'test-co-contract', impactBRL: 5000 }),
    requiredPayloadFields: ['projectId', 'changeOrderId', 'impactBRL'],
  },
  {
    type: EventType.CHANGE_ORDER_SUBMITTED,
    getData: (projectId) => ({
      projectId,
      changeOrderId: 'test-co-contract',
      title: 'CO de Teste',
      impactHours: 8,
      requestedBy: 'test-user-contract',
    }),
    requiredPayloadFields: ['projectId', 'changeOrderId', 'title', 'impactHours', 'requestedBy'],
  },
  {
    type: EventType.CHANGE_ORDER_APPROVED,
    getData: (projectId) => ({
      projectId,
      changeOrderId: 'test-co-contract',
      approvedBy: 'test-user-contract',
      impactHours: 8,
      impactCost: 1680,
      requestedBy: 'test-dev-contract',
    }),
    requiredPayloadFields: ['projectId', 'changeOrderId', 'approvedBy', 'impactHours', 'impactCost', 'requestedBy'],
  },
  {
    type: EventType.CHANGE_ORDER_REJECTED,
    getData: (projectId) => ({
      projectId,
      changeOrderId: 'test-co-contract',
      rejectedBy: 'test-user-contract',
      reason: 'Fora de escopo',
      requestedBy: 'test-dev-contract',
    }),
    requiredPayloadFields: ['projectId', 'changeOrderId', 'rejectedBy', 'reason', 'requestedBy'],
  },

  // ── HandoffAI ─────────────────────────────────────────────────────────────
  {
    type: EventType.RAG_INDEX_STARTED,
    getData: (projectId) => ({ projectId, repoUrl: 'https://github.com/test/repo' }),
    requiredPayloadFields: ['projectId', 'repoUrl'],
  },
  {
    type: EventType.RAG_INDEX_COMPLETED,
    getData: (projectId) => ({ projectId, chunkCount: 48, indexDurationMs: 3200 }),
    requiredPayloadFields: ['projectId', 'chunkCount', 'indexDurationMs'],
  },

  // ── Rentabilia ────────────────────────────────────────────────────────────
  {
    type: EventType.COST_CONFIG_UPDATED,
    getData: (_projectId) => ({ updatedBy: 'test-user-contract', role: 'DEV', newRate: 210, changes: ['hourlyRate'] }),
    requiredPayloadFields: ['updatedBy', 'role', 'newRate'],
  },
  {
    type: EventType.PROFIT_REPORT_GENERATED,
    getData: (projectId) => ({ projectId, marginPct: 35.5 }),
    requiredPayloadFields: ['projectId', 'marginPct'],
  },

  // ── ClientPortal ───────────────────────────────────────────────────────────
  {
    type: EventType.CLIENT_ACCESS_GRANTED,
    getData: (projectId) => ({ projectId, clientEmail: 'client@test.com' }),
    requiredPayloadFields: ['projectId', 'clientEmail'],
  },
  {
    type: EventType.CLIENT_INVITED,
    getData: (projectId) => ({
      projectId,
      clientEmail: 'client@test.com',
      inviteToken: 'test-token-contract',
      invitedBy: 'test-user-contract',
      clientAccessId: 'test-access-contract',
    }),
    requiredPayloadFields: ['projectId', 'clientEmail', 'inviteToken', 'invitedBy', 'clientAccessId'],
  },
  {
    type: EventType.CLIENT_ACCEPTED,
    getData: (projectId) => ({
      projectId,
      clientEmail: 'client@test.com',
      userId: 'test-client-user',
      clientAccessId: 'test-access-contract',
    }),
    requiredPayloadFields: ['projectId', 'clientEmail', 'userId', 'clientAccessId'],
  },
  {
    type: EventType.EMAIL_FAILED,
    getData: (projectId) => ({
      projectId,
      clientEmail: 'client@test.com',
      clientAccessId: 'test-access-contract',
      reason: 'SMTP timeout',
    }),
    requiredPayloadFields: ['projectId', 'clientEmail', 'clientAccessId', 'reason'],
  },
  {
    type: EventType.APPROVAL_REQUESTED,
    getData: (projectId) => ({
      projectId,
      approvalId: 'test-approval-contract',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    }),
    requiredPayloadFields: ['projectId', 'approvalId', 'expiresAt'],
  },
  {
    type: EventType.APPROVAL_SUBMITTED,
    getData: (projectId) => ({
      projectId,
      approvalId: 'test-approval-contract',
      decision: 'APPROVED' as const,
    }),
    requiredPayloadFields: ['projectId', 'approvalId', 'decision'],
  },
  {
    type: EventType.APPROVAL_EXPIRED,
    getData: (projectId) => ({ projectId, approvalId: 'test-approval-contract' }),
    requiredPayloadFields: ['projectId', 'approvalId'],
  },

  // ── Sistema ────────────────────────────────────────────────────────────────
  {
    type: EventType.PROJECT_CREATED,
    getData: (projectId) => ({ projectId, createdBy: 'test-user-contract' }),
    requiredPayloadFields: ['projectId', 'createdBy'],
  },
  {
    type: EventType.PROJECT_STATUS_CHANGED,
    getData: (projectId) => ({ projectId, from: 'BRIEFING', to: 'ACTIVE' }),
    requiredPayloadFields: ['projectId', 'from', 'to'],
  },
]

describe('EventBus Contract: EventType Fixtures Coverage', () => {
  it(`fixtures cobrem todos os ${Object.values(EventType).length} EventTypes definidos`, () => {
    const allTypes = Object.values(EventType)
    const testedTypes = new Set(EVENT_FIXTURES.map((f) => f.type))
    const untestedTypes = allTypes.filter((t) => !testedTypes.has(t))

    if (untestedTypes.length > 0) {
      console.log('\n  EventTypes sem fixture de teste:')
      untestedTypes.forEach((t) => console.log(`    - ${t}`))
    }

    expect(untestedTypes).toHaveLength(0)
  })

  it('cada fixture tem requiredPayloadFields não vazios', () => {
    for (const fixture of EVENT_FIXTURES) {
      expect(
        fixture.requiredPayloadFields.length,
        `Fixture '${fixture.type}' tem requiredPayloadFields vazio`,
      ).toBeGreaterThan(0)
    }
  })
})

describe.skipIf(!hasDb)('EventBus Contract: Payload shape em banco real', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let EventBus: any
  let testProjectId: string

  beforeAll(async () => {
    const dbModule = await import('@/lib/db')
    prisma = dbModule.prisma ?? dbModule.getPrismaClient?.()
    const busModule = await import('@/lib/events/bus')
    EventBus = busModule.EventBus

    // Tentar encontrar projeto existente para testes
    const project = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!project) {
      console.warn('\n  [WARN] Nenhum projeto no banco. Testes de payload serão skippados.')
      return
    }
    testProjectId = project.id
    console.log(`\n  Usando projeto de teste: ${testProjectId}`)
  })

  afterAll(async () => {
    if (prisma && testProjectId) {
      await prisma.event
        .deleteMany({
          where: {
            projectId: testProjectId,
            sourceModule: 'contract-test',
          },
        })
        .catch(() => {/* ignora erros de cleanup */})
      await prisma.$disconnect().catch(() => {})
    }
  })

  it.each(EVENT_FIXTURES)(
    'EventType $type cria Event com payload correto',
    async ({ type, getData, requiredPayloadFields }) => {
      if (!testProjectId) {
        console.log(`  [SKIP] ${type} — sem projeto de teste`)
        return
      }

      const data = getData(testProjectId)

      // Publicar evento — uses projectId do próprio payload quando disponível
      const projectId = (data.projectId as string) ?? testProjectId
      await EventBus.publish(type, projectId, data, 'contract-test')

      // Verificar que Event foi criado
      const event = await prisma.event.findFirst({
        where: { type, projectId, sourceModule: 'contract-test' },
        orderBy: { createdAt: 'desc' },
      })

      expect(event, `Event não criado para type '${type}'`).not.toBeNull()
      expect(event.type).toBe(type)

      // Verificar campos obrigatórios no payload
      const storedPayload = event.payload as Record<string, unknown>
      for (const field of requiredPayloadFields) {
        expect(
          storedPayload[field],
          `EventType '${type}': campo '${field}' ausente no payload armazenado`,
        ).toBeDefined()
      }
    },
  )
})
