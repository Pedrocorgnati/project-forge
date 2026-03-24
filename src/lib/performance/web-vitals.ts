// Web Vitals — instrumentação de desenvolvimento
// Para ativar: npm install web-vitals
// O projeto já usa @vercel/speed-insights que envia métricas automaticamente para o dashboard Vercel.
// Este arquivo adiciona logging no console para depuração local.
//
// Baseline capturado antes das otimizações de performance (T001-T008):
// LCP:  ____ ms
// CLS:  ____
// INP:  ____ ms
// FCP:  ____ ms
// TTFB: ____ ms

interface Metric {
  value: number
  rating?: string
}

export async function reportWebVitals(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vitals = await import('web-vitals' as any)

    vitals.onLCP(({ value, rating }: Metric) => {
      console.debug(`[Vitals] LCP: ${value.toFixed(0)}ms (${rating ?? ''})`)
    })
    vitals.onCLS(({ value, rating }: Metric) => {
      console.debug(`[Vitals] CLS: ${value.toFixed(4)} (${rating ?? ''})`)
    })
    vitals.onINP(({ value, rating }: Metric) => {
      console.debug(`[Vitals] INP: ${value.toFixed(0)}ms (${rating ?? ''})`)
    })
    vitals.onFCP(({ value }: Metric) => {
      console.debug(`[Vitals] FCP: ${value.toFixed(0)}ms`)
    })
    vitals.onTTFB(({ value }: Metric) => {
      console.debug(`[Vitals] TTFB: ${value.toFixed(0)}ms`)
    })
  } catch {
    // web-vitals não instalado — instale com: npm install web-vitals
  }
}
