import type { EventHandler } from '../types'

// ─── HANDLER REGISTRY ─────────────────────────────────────────────────────────

const handlerRegistry: Partial<Record<string, EventHandler[]>> = {}

/**
 * Registra um handler para um tipo de evento.
 * Pode ser chamado múltiplas vezes para o mesmo tipo (acumula handlers).
 */
export function registerHandler(type: string, handler: EventHandler): void {
  if (!handlerRegistry[type]) {
    handlerRegistry[type] = []
  }
  handlerRegistry[type].push(handler)
}

// ─── STATIC IMPORTS (server-side — sem race condition) ────────────────────────

import { registerBriefHandlers } from './brief-handlers'
import { registerEstimateHandlers } from './estimate-handlers'
import { registerScopeHandlers } from './scope-handlers'
import { registerApprovalHandlers } from './approval-handlers'
import { registerProjectHandlers } from './project-handlers'
import { registerNoopHandlers } from './noop-handlers'
import { registerScopeAlertHandlers } from '@/lib/event-handlers/scope-alert-handler'
import { registerScopeCacheInvalidationHandlers } from '@/lib/event-handlers/scope-cache-invalidation-handler'
import { registerChangeOrderHandlers } from '@/lib/event-handlers/change-order-handler'
import { registerRAGHandlers } from './rag-handlers'

let initialized = false

function ensureInitialized(): void {
  if (initialized) return
  initialized = true

  registerBriefHandlers(registerHandler)
  registerEstimateHandlers(registerHandler)
  registerScopeHandlers(registerHandler)
  registerApprovalHandlers(registerHandler)
  registerProjectHandlers(registerHandler)
  registerNoopHandlers(registerHandler)
  // module-10: scope alert notification + cache invalidation
  registerScopeAlertHandlers(registerHandler)
  registerScopeCacheInvalidationHandlers(registerHandler)
  // module-11: change order workflow handlers
  registerChangeOrderHandlers(registerHandler)
  // module-12: RAG auto-indexation (Brief + Estimates)
  registerRAGHandlers(registerHandler)
}

/**
 * Retorna os handlers registrados para o tipo de evento.
 * Retorna array vazio para tipos sem handler (não é erro — apenas nenhuma ação).
 */
export function getHandlersForType(type: string): EventHandler[] {
  ensureInitialized()
  return handlerRegistry[type] ?? []
}
