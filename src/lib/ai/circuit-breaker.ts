// ─── CIRCUIT BREAKER ─────────────────────────────────────────────────────────

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN'

/**
 * Implementação do padrão Circuit Breaker para o AI Provider.
 *
 * Estados:
 * - CLOSED: chamadas passam normalmente
 * - OPEN: chamadas bloqueadas imediatamente (após `threshold` falhas consecutivas)
 * - HALF-OPEN: uma chamada de teste permitida (após `resetMs` em estado OPEN)
 *
 * Estado em memória — resetado em restart do servidor (by design).
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private lastFailureTime: number | null = null
  private readonly threshold: number
  private readonly resetMs: number

  constructor(threshold = 3, resetMs = 60_000) {
    this.threshold = threshold
    this.resetMs = resetMs
  }

  /**
   * Verifica se o circuito está aberto (chamadas bloqueadas).
   * Transiciona automaticamente OPEN → HALF-OPEN após resetMs.
   */
  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - (this.lastFailureTime ?? 0) >= this.resetMs) {
        this.state = 'HALF-OPEN'
        return false
      }
      return true
    }
    return false
  }

  /**
   * Registra uma chamada bem-sucedida.
   * Transiciona qualquer estado → CLOSED e reseta o contador.
   */
  recordSuccess(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.lastFailureTime = null
  }

  /**
   * Registra uma falha.
   * Após `threshold` falhas consecutivas, transiciona CLOSED → OPEN.
   */
  recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN'
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }
}

// Singleton global — compartilhado entre todas as requisições no mesmo processo
export const aiCircuitBreaker = new CircuitBreaker()
