// @vitest-environment jsdom
/**
 * DADO que os insights de IA estão indisponíveis (ESTIMAI)
 * QUANDO o painel de rentabilidade é renderizado
 * ENTÃO deve exibir AIInsightsFallbackBanner sem travar o dashboard
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AIInsightsFallbackBanner } from '@/components/profitability/AIInsightsFallbackBanner'

// ─── CENÁRIO 2: ESTIMAI — Fallback de insights ────────────────────────────────

describe('ESTIMAI — Modo Degradado', () => {
  it('DADO insights indisponíveis QUANDO banner é renderizado ENTÃO mensagem padrão é visível', () => {
    // DADO / QUANDO
    render(<AIInsightsFallbackBanner />)

    // ENTÃO
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/insights de ia temporariamente indisponíveis/i)
    expect(alert).toHaveTextContent(/dashboard continua funcional/i)
  })

  it('DADO mensagem customizada QUANDO banner é renderizado ENTÃO mensagem customizada é exibida', () => {
    // DADO
    const customMessage = 'EstimaAI em modo limitado: usando apenas benchmarks históricos.'

    // QUANDO
    render(<AIInsightsFallbackBanner message={customMessage} />)

    // ENTÃO
    expect(screen.getByRole('alert')).toHaveTextContent(customMessage)
  })

  it('DADO modo degradado QUANDO banner renderiza ENTÃO tem aria-live="polite"', () => {
    // DADO / QUANDO
    render(<AIInsightsFallbackBanner />)

    // ENTÃO — aria-live polite não interrompe fluxo do leitor de tela
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')
  })

  it('DADO modo degradado QUANDO banner renderiza ENTÃO ícone de aviso está oculto para leitores de tela', () => {
    // DADO / QUANDO
    render(<AIInsightsFallbackBanner />)

    // ENTÃO — ícone decorativo com aria-hidden
    const icons = screen.getByRole('alert').querySelectorAll('svg[aria-hidden="true"]')
    expect(icons.length).toBeGreaterThan(0)
  })
})
