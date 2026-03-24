// ─── SCOPE VALIDATOR CACHE ────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-1 / ST001
// Cache em memória com TTL=1h para resultados de validação semântica.
// Invalidado por BRIEF_CREATED, ESTIMATE_CREATED, ESTIMATE_REVISED via EventBus.
// Rastreabilidade: INT-066

// TTL = 1 hora
const CACHE_TTL_MS = 60 * 60 * 1000

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

// Singleton em módulo (sobrevive entre requisições no mesmo processo Next.js)
const store = new Map<string, CacheEntry<unknown>>()

export class ScopeValidatorCache {
  get<T>(key: string): T | null {
    const entry = store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      store.delete(key)
      return null
    }
    return entry.data
  }

  set<T>(key: string, data: T): void {
    store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  }

  invalidateProject(projectId: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(`${projectId}:`)) store.delete(key)
    }
    console.info('[ScopeCache] Cache invalidado para projeto', { projectId })
  }
}
