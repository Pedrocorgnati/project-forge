// @vitest-environment jsdom
/**
 * DADO que o DegradedBanner tem retryAfterMs configurado
 * QUANDO o countdown chega a zero
 * ENTÃO onRetry é chamado automaticamente
 *
 * DADO que o banner é dispensado (dismiss)
 * QUANDO a página é recarregada
 * ENTÃO banner não reaparece (localStorage persiste dismiss)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { DegradedBanner } from '@/components/ui/degraded-banner'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

// ─── CENÁRIO 4: DegradedBanner — countdown e persistência ────────────────────

describe('DegradedBanner — Countdown e Dismiss', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('DADO isAvailable=false QUANDO renderizado ENTÃO banner é visível com mensagem correta', () => {
    // DADO / QUANDO
    render(<DegradedBanner module="BRIEFFORGE" isAvailable={false} />)

    // ENTÃO
    const banner = screen.getByRole('alert')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent(/modo limitado/i)
    expect(banner).toHaveTextContent(/briefforge/i)
  })

  it('DADO isAvailable=true QUANDO renderizado ENTÃO banner NÃO é exibido', () => {
    // DADO / QUANDO
    render(<DegradedBanner module="BRIEFFORGE" isAvailable={true} />)

    // ENTÃO
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('DADO retryAfterMs=3000 QUANDO 3s passam ENTÃO onRetry é chamado', async () => {
    // DADO
    const onRetry = vi.fn()

    render(
      <DegradedBanner
        module="BRIEFFORGE"
        isAvailable={false}
        retryAfterMs={3000}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText(/tentando reconectar em 3s/i)).toBeInTheDocument()

    // QUANDO — avança 1s
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByText(/tentando reconectar em 2s/i)).toBeInTheDocument()

    // QUANDO — avança mais 2s (total 3s)
    act(() => { vi.advanceTimersByTime(2000) })

    // ENTÃO
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  it('DADO banner visível QUANDO usuário dispensa ENTÃO banner some e localStorage é atualizado', async () => {
    // DADO
    const user = userEvent.setup({ delay: null })
    const onDismiss = vi.fn()

    render(
      <DegradedBanner module="ESTIMAI" isAvailable={false} onDismiss={onDismiss} />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    // QUANDO
    const dismissBtn = screen.getByRole('button', { name: /fechar aviso/i })
    await user.click(dismissBtn)

    // ENTÃO — banner desaparece
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onDismiss).toHaveBeenCalledTimes(1)

    // E — dismiss persiste no localStorage
    expect(localStorage.getItem(STORAGE_KEYS.DEGRADED_FLAG('ESTIMAI'))).toBe('true')
  })

  it('DADO dismiss salvo no localStorage QUANDO componente monta ENTÃO banner não aparece', () => {
    // DADO — dismiss já foi feito anteriormente
    localStorage.setItem(STORAGE_KEYS.DEGRADED_FLAG('HANDOFFAI'), 'true')

    // QUANDO
    render(<DegradedBanner module="HANDOFFAI" isAvailable={false} />)

    // ENTÃO — banner não aparece pois foi dispensado
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('DADO banner foi dispensado QUANDO isAvailable muda para true ENTÃO localStorage é limpo', async () => {
    // DADO — dismiss gravado
    localStorage.setItem(STORAGE_KEYS.DEGRADED_FLAG('BRIEFFORGE'), 'true')

    const { rerender } = render(
      <DegradedBanner module="BRIEFFORGE" isAvailable={false} />,
    )

    // QUANDO — IA fica disponível novamente
    rerender(<DegradedBanner module="BRIEFFORGE" isAvailable={true} />)

    // ENTÃO — localStorage limpo (próxima vez que ficar indisponível, mostra o banner de novo)
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.DEGRADED_FLAG('BRIEFFORGE'))).toBeNull()
    })
  })
})
