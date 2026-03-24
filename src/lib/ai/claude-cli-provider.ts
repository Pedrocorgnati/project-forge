import { spawn } from 'child_process'
import { hasSuspiciousContent } from '@/lib/utils/validate'
import { aiCircuitBreaker } from './circuit-breaker'
import { AIProviderError, type AIProvider, type AIGenerateOptions, type AIStreamOptions } from './provider'

// ─── CLAUDE CLI PROVIDER ──────────────────────────────────────────────────────

/**
 * Implementação do AIProvider usando Claude CLI como subprocess Node.js.
 *
 * Proteções implementadas:
 * - Prompt injection: hasSuspiciousContent() antes de spawn
 * - Timeout: AbortController + setTimeout (60s generate, 5s health)
 * - Circuit breaker: bloqueio após 3 falhas consecutivas
 * - Subprocess cleanup: SIGTERM em timeout ou abort
 */
export class ClaudeCliProvider implements AIProvider {
  readonly name = 'claude-cli'
  private readonly timeoutMs = 60_000
  private readonly healthTimeoutMs = 5_000

  async generate(prompt: string, options?: AIGenerateOptions): Promise<string> {
    // Circuit breaker check
    if (aiCircuitBreaker.isOpen()) {
      throw new AIProviderError('UNAVAILABLE', 'AI provider indisponível (circuit breaker OPEN)')
    }

    // Prompt injection check
    if (hasSuspiciousContent(prompt)) {
      console.warn({ event: 'INJECTION_DETECTED', prompt: prompt.substring(0, 50) })
      throw new AIProviderError('INJECTION_DETECTED', 'Prompt contém conteúdo suspeito')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options?.abortSignal ? 0 : this.timeoutMs)

    // Forward external abort signal
    options?.abortSignal?.addEventListener('abort', () => controller.abort())

    try {
      const result = await this._spawnClaude(['-p', prompt], controller.signal)
      aiCircuitBreaker.recordSuccess()
      return result
    } catch (err) {
      aiCircuitBreaker.recordFailure()
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  async *stream(prompt: string, options?: AIStreamOptions): AsyncGenerator<string> {
    if (aiCircuitBreaker.isOpen()) {
      throw new AIProviderError('UNAVAILABLE', 'AI provider indisponível (circuit breaker OPEN)')
    }

    if (hasSuspiciousContent(prompt)) {
      console.warn({ event: 'INJECTION_DETECTED', prompt: prompt.substring(0, 50) })
      throw new AIProviderError('INJECTION_DETECTED', 'Prompt contém conteúdo suspeito')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    options?.abortSignal?.addEventListener('abort', () => controller.abort())

    const child = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const cleanup = () => {
      clearTimeout(timeout)
      if (!child.killed) child.kill('SIGTERM')
    }

    controller.signal.addEventListener('abort', cleanup)

    try {
      for await (const chunk of child.stdout) {
        if (controller.signal.aborted) break
        const text = chunk.toString()
        options?.onChunk?.(text)
        yield text
      }

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) resolve()
          else reject(new AIProviderError('SUBPROCESS_ERROR', `Claude CLI encerrou com código ${code}`))
        })
        child.on('error', reject)
      })

      aiCircuitBreaker.recordSuccess()
    } catch (err) {
      aiCircuitBreaker.recordFailure()
      if (controller.signal.aborted) {
        throw new AIProviderError('TIMEOUT', `Timeout após ${this.timeoutMs}ms`)
      }
      throw err instanceof AIProviderError ? err : new AIProviderError('SUBPROCESS_ERROR', String(err))
    } finally {
      cleanup()
    }
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!child.killed) child.kill('SIGTERM')
        resolve(false)
      }, this.healthTimeoutMs)

      const child = spawn('claude', ['--version'], {
        stdio: ['ignore', 'ignore', 'ignore'],
      })

      child.on('close', (code) => {
        clearTimeout(timeout)
        resolve(code === 0)
      })

      child.on('error', () => {
        clearTimeout(timeout)
        resolve(false)
      })
    })
  }

  // ── HELPER PRIVADO ─────────────────────────────────────────────────────────

  private _spawnClaude(args: string[], signal: AbortSignal): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
      child.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

      const onAbort = () => {
        if (!child.killed) child.kill('SIGTERM')
        reject(new AIProviderError('TIMEOUT', `Timeout após ${this.timeoutMs}ms`))
      }

      signal.addEventListener('abort', onAbort)

      child.on('close', (code) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) return
        if (code === 0) {
          resolve(stdout.trim())
        } else {
          reject(new AIProviderError('SUBPROCESS_ERROR', stderr.trim() || `Exit code ${code}`))
        }
      })

      child.on('error', (err) => {
        signal.removeEventListener('abort', onAbort)
        reject(new AIProviderError('SUBPROCESS_ERROR', err.message))
      })
    })
  }
}
