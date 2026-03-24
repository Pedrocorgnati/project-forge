// ─── SCOPE CACHE INVALIDATION HANDLER ────────────────────────────────────────
// module-10-scopeshield-validation / TASK-1 / ST005
// Invalida cache do ScopeValidator quando Brief ou Estimate mudam.
// Rastreabilidade: INT-066

import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import { ScopeValidatorCache } from '@/lib/services/scope-validator-cache'

type RegisterFn = (type: string, handler: (event: Event) => Promise<void>) => void

const cacheInstance = new ScopeValidatorCache()

export function registerScopeCacheInvalidationHandlers(register: RegisterFn): void {
  register(EventType.ESTIMATE_CREATED, handleScopeCacheInvalidation)
  register(EventType.ESTIMATE_REVISED, handleScopeCacheInvalidation)
  register(EventType.BRIEF_CREATED, handleScopeCacheInvalidation)
}

export async function handleScopeCacheInvalidation(event: Event): Promise<void> {
  const payload = event.payload as { projectId: string }
  if (!payload.projectId) return

  cacheInstance.invalidateProject(payload.projectId)
}
