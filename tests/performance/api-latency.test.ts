/**
 * tests/performance/api-latency.test.ts
 *
 * Testes de latência para rotas de API críticas.
 * Verifica que endpoints respondem dentro do SLO (p95 < 500ms).
 *
 * Uso: npx vitest run tests/performance/ --reporter=verbose
 *
 * NOTA: Este teste requer um servidor Next.js rodando ou um build completo.
 * No CI, rodar contra a preview URL ou localhost após `next start`.
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BASE_URL ?? 'http://localhost:3000'
const LATENCY_SLO_MS = 500 // SLO: p95 < 500ms
const WARMUP_REQUESTS = 3  // Requests de warmup (ignorados na medição)
const MEASURED_REQUESTS = 10 // Requests para calcular média

async function measureLatency(
  path: string,
  headers: Record<string, string> = {}
): Promise<{ mean: number; p50: number; p95: number; max: number }> {
  const durations: number[] = []

  // Warmup (não medir)
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    try {
      await fetch(`${BASE_URL}${path}`, { headers })
    } catch {
      // Ignorar erros de warmup
    }
  }

  // Medição
  for (let i = 0; i < MEASURED_REQUESTS; i++) {
    const start = Date.now()
    const res = await fetch(`${BASE_URL}${path}`, { headers })
    const duration = Date.now() - start
    expect(res.status).not.toBe(500)
    durations.push(duration)
  }

  durations.sort((a, b) => a - b)
  return {
    mean: durations.reduce((a, b) => a + b, 0) / durations.length,
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    max: durations[durations.length - 1],
  }
}

describe('API Performance SLO', () => {
  it('GET /api/healthz responde em < 100ms (p95)', async () => {
    const stats = await measureLatency('/api/healthz')
    console.log(
      `  healthz: mean=${stats.mean.toFixed(0)}ms, p50=${stats.p50}ms, p95=${stats.p95}ms, max=${stats.max}ms`
    )
    expect(stats.p95).toBeLessThan(100)
  }, 30_000)

  it('GET /api/projects responde em < 500ms (p95)', async () => {
    const stats = await measureLatency('/api/projects', {
      Authorization: `Bearer ${process.env.TEST_AUTH_TOKEN ?? ''}`,
    })
    console.log(
      `  projects: mean=${stats.mean.toFixed(0)}ms, p50=${stats.p50}ms, p95=${stats.p95}ms, max=${stats.max}ms`
    )
    expect(stats.p95).toBeLessThan(LATENCY_SLO_MS)
  }, 30_000)
})
