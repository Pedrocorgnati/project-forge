// ─── AI PROVIDER INTERFACE ────────────────────────────────────────────────────

export interface AIGenerateOptions {
  maxTokens?: number
  temperature?: number
  system?: string
  abortSignal?: AbortSignal
}

export interface AIStreamOptions extends AIGenerateOptions {
  onChunk?: (chunk: string) => void
}

/**
 * Contrato abstrato de IA — módulos de feature nunca dependem da implementação concreta.
 * Permite substituição por mock em testes e mudança de provedor sem alterar código de feature.
 */
export interface AIProvider {
  readonly name: string
  generate(prompt: string, options?: AIGenerateOptions): Promise<string>
  stream(prompt: string, options?: AIStreamOptions): AsyncGenerator<string>
  isAvailable(): Promise<boolean>
}

// ─── ERROS TIPADOS ────────────────────────────────────────────────────────────

export class AIProviderError extends Error {
  constructor(
    public readonly code: 'UNAVAILABLE' | 'TIMEOUT' | 'INJECTION_DETECTED' | 'SUBPROCESS_ERROR',
    message: string,
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}
