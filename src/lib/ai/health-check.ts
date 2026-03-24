import { ClaudeCliProvider } from './claude-cli-provider'

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

export interface AIHealthResult {
  available: boolean
  latencyMs?: number
}

/**
 * Verifica disponibilidade do Claude CLI com timeout curto.
 * Retorna em ≤ timeoutMs — nunca lança exceção.
 *
 * @param timeoutMs - Timeout em ms (padrão: 5000)
 */
export async function checkAIHealth(timeoutMs = 5_000): Promise<AIHealthResult> {
  const start = Date.now()
  try {
    const provider = new ClaudeCliProvider()
    const available = await Promise.race([
      provider.isAvailable(),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ])
    return {
      available,
      latencyMs: available ? Date.now() - start : undefined,
    }
  } catch {
    return { available: false }
  }
}
