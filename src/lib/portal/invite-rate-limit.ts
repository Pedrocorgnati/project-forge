// src/lib/portal/invite-rate-limit.ts
// module-16-clientportal-auth / TASK-1 ST007
// Rate limiter baseado em contagem por janela de tempo (sliding window em memória)
// Limite: 10 convites por projeto por hora
// Rastreabilidade: INT-102

interface WindowEntry {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()

const INVITE_LIMIT = 10
const WINDOW_MS = 60 * 60 * 1000 // 1 hora

/**
 * Verifica e registra um convite contra o rate limit por projeto.
 *
 * @param projectId - ID do projeto sendo verificado
 * @returns `{ allowed: true }` ou `{ allowed: false, retryAfter: segundos }`
 */
export function checkInviteRateLimit(
  projectId: string,
): { allowed: true } | { allowed: false; retryAfter: number } {
  const key = `invite:${projectId}`
  const now = Date.now()

  const entry = windows.get(key) ?? { timestamps: [] }

  // Limpar timestamps fora da janela
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS)

  if (entry.timestamps.length >= INVITE_LIMIT) {
    // Calcular quando o mais antigo vai expirar
    const oldest = entry.timestamps[0]
    const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000)
    windows.set(key, entry)
    return { allowed: false, retryAfter }
  }

  // Registrar este convite
  entry.timestamps.push(now)
  windows.set(key, entry)
  return { allowed: true }
}
