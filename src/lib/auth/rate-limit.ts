// src/lib/auth/rate-limit.ts
//
// Rate limiter em memória para endpoints de autenticação.
// Adequado para deploys single-server. Em produção multi-instância, substituir por Redis.

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ENTRIES = 10_000

// Limpeza periódica: remove entradas expiradas + hard cap por eviction das mais antigas
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of attempts) {
      if (v.resetAt <= now) attempts.delete(k)
    }
    // Hard cap: se ainda acima do limite, remove as entradas com resetAt mais baixo
    if (attempts.size > MAX_ENTRIES) {
      const sorted = [...attempts.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
      for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
        attempts.delete(sorted[i]![0])
      }
    }
  }, 60_000).unref?.()
}

const LIMITS: Record<number, number> = {
  5:  15 * 60 * 1000,   // 5 tentativas → bloqueio de 15min
  10: 60 * 60 * 1000,   // 10 tentativas → bloqueio de 1h
  20: 24 * 60 * 60 * 1000, // 20 tentativas → bloqueio de 24h
}

/**
 * Verifica se a chave está dentro do limite permitido.
 *
 * @param key - Identificador da chave (ex: `login:${ip}` ou `invite:${email}`)
 * @returns `{ allowed: true }` se permitido, `{ allowed: false, retryAfter }` se bloqueado
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = attempts.get(key)

  if (entry && entry.resetAt > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  if (entry && entry.resetAt <= now) {
    attempts.delete(key)
  }

  return { allowed: true }
}

/**
 * Registra uma tentativa falhada para a chave informada.
 * Aplica bloqueio progressivo conforme os limiares definidos em LIMITS.
 *
 * @param key - Identificador da chave
 */
export function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const entry = attempts.get(key) ?? { count: 0, resetAt: 0 }
  entry.count++

  // Percorre os limiares do maior para o menor para aplicar o bloqueio mais restritivo
  for (const [threshold, duration] of Object.entries(LIMITS)
    .map(([t, d]) => [Number(t), d] as [number, number])
    .sort(([a], [b]) => b - a)) {
    if (entry.count >= threshold) {
      entry.resetAt = now + duration
      break
    }
  }

  attempts.set(key, entry)
}

/**
 * Remove o registro de tentativas para a chave informada.
 * Deve ser chamado após autenticação bem-sucedida.
 *
 * @param key - Identificador da chave
 */
export function clearAttempts(key: string): void {
  attempts.delete(key)
}
