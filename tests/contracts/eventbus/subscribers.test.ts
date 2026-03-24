/**
 * Contract Test: EventBus Subscriber Registry
 *
 * Valida que cada EventType tem pelo menos um handler registrado.
 * Não requer banco de dados — testa apenas o registry em memória.
 *
 * Tipos sem handler são considerados "publicados no vazio" — um risco de
 * perda silenciosa de eventos. Este teste documenta o estado atual do registry.
 */
import { describe, it, expect } from 'vitest'
import { EventType } from '@/lib/constants/events'
import { getHandlersForType } from '@/lib/events/handlers'

// EventTypes que intencionalmente não têm handler de negócio ainda
// (podem ter apenas noop handler — que ainda conta como handler registrado)
// Atualizar quando handlers forem implementados.
const KNOWN_PENDING_HANDLERS: string[] = [
  // module-9 ScopeShield board: tasks não têm handlers de downstream ainda
  EventType.TASK_CREATED,
  EventType.TASK_UPDATED,
  EventType.TASK_STATUS_CHANGED,
  // module-12/13 HandoffAI: RAG_INDEX_COMPLETED não tem handler
  EventType.RAG_INDEX_COMPLETED,
  // module-16 ClientPortal: fluxos de convite ainda pendentes
  EventType.CLIENT_INVITED,
  EventType.CLIENT_ACCEPTED,
  EventType.EMAIL_FAILED,
]

describe('EventBus Contract: Subscriber Registry', () => {
  const allTypes = Object.values(EventType)

  it(`total de EventTypes no sistema`, () => {
    console.log(`\n  Total de EventTypes: ${allTypes.length}`)
    expect(allTypes.length).toBeGreaterThan(0)
  })

  it('todos os EventTypes conhecidos têm pelo menos 1 handler ou estão na lista de pendentes', () => {
    const missingHandlers: string[] = []
    const withHandlers: string[] = []

    for (const type of allTypes) {
      const handlers = getHandlersForType(type)
      if (!handlers || handlers.length === 0) {
        if (!KNOWN_PENDING_HANDLERS.includes(type)) {
          missingHandlers.push(type)
        }
      } else {
        withHandlers.push(type)
      }
    }

    console.log(`\n  EventTypes com handlers: ${withHandlers.length}/${allTypes.length}`)
    console.log(`  EventTypes pendentes (KNOWN_PENDING_HANDLERS): ${KNOWN_PENDING_HANDLERS.length}`)

    if (missingHandlers.length > 0) {
      console.log('\n  EventTypes SEM handler e fora da lista de pendentes (NOVO GAP):')
      missingHandlers.forEach((t) => console.log(`    - ${t}`))
      console.log('\n  Adicione o type a KNOWN_PENDING_HANDLERS ou implemente o handler.')
    }

    expect(
      missingHandlers,
      'EventTypes sem handler que não estão na lista de pendentes',
    ).toHaveLength(0)
  })

  it('cada handler registrado é uma função callable', () => {
    for (const type of allTypes) {
      const handlers = getHandlersForType(type) ?? []
      for (const handler of handlers) {
        expect(typeof handler, `Handler de '${type}' não é função`).toBe('function')
      }
    }
  })

  it('handler de aprovação registrado para eventos CLIENT_APPROVAL_*', () => {
    const approvalEvents = [
      EventType.APPROVAL_REQUESTED,
      EventType.APPROVAL_SUBMITTED,
      EventType.APPROVAL_EXPIRED,
    ]

    for (const type of approvalEvents) {
      const handlers = getHandlersForType(type) ?? []
      expect(
        handlers.length,
        `EventType '${type}' (aprovação) precisa de pelo menos 1 handler`,
      ).toBeGreaterThan(0)
    }
  })

  it('handler de projeto registrado para eventos cross-rock (PROJECT_*)', () => {
    const projectEvents = [
      EventType.PROJECT_CREATED,
      EventType.PROJECT_STATUS_CHANGED,
    ]

    for (const type of projectEvents) {
      const handlers = getHandlersForType(type) ?? []
      expect(
        handlers.length,
        `EventType '${type}' (projeto) precisa de pelo menos 1 handler`,
      ).toBeGreaterThan(0)
    }
  })

  it('handlers de estimate registrados (ESTIMATE_* críticos)', () => {
    const estimateEvents = [
      EventType.ESTIMATE_CREATED,
      EventType.ESTIMATE_APPROVED,
      EventType.ESTIMATE_REVISED,
    ]

    for (const type of estimateEvents) {
      const handlers = getHandlersForType(type) ?? []
      expect(
        handlers.length,
        `EventType '${type}' (estimate) precisa de pelo menos 1 handler`,
      ).toBeGreaterThan(0)
    }
  })

  it('cobertura de handlers: relatorio de estado atual', () => {
    let covered = 0
    let pending = 0
    let unknown = 0

    for (const type of allTypes) {
      const handlers = getHandlersForType(type) ?? []
      if (handlers.length > 0) {
        covered++
      } else if (KNOWN_PENDING_HANDLERS.includes(type)) {
        pending++
      } else {
        unknown++
      }
    }

    const coveragePercent = Math.round((covered / allTypes.length) * 100)
    console.log(
      `\n  Handler coverage: ${covered}/${allTypes.length} (${coveragePercent}%) | ` +
      `Pendentes: ${pending} | Gaps: ${unknown}`,
    )

    // Garantir cobertura mínima de 70% com handlers reais
    expect(coveragePercent).toBeGreaterThanOrEqual(70)
  })
})
