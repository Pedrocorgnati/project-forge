// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { AnswerInput } from '../answer-input'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Send: ({ size, ...props }: { size?: number } & Record<string, unknown>) => (
    <svg data-testid="send-icon" {...props} />
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('AnswerInput', () => {
  let onSubmit: (answer: string) => void

  beforeEach(() => {
    onSubmit = vi.fn() as unknown as (answer: string) => void
  })

  it('renderiza com placeholder padrão "Digite sua resposta..."', () => {
    render(<AnswerInput onSubmit={onSubmit} />)

    const textarea = screen.getByTestId('briefforge-answer-input')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder', 'Digite sua resposta...')
  })

  it('digitar < 10 chars e submeter → mensagem "Resposta muito curta" visível', async () => {
    const user = userEvent.setup()
    render(<AnswerInput onSubmit={onSubmit} />)

    const textarea = screen.getByTestId('briefforge-answer-input')
    await user.type(textarea, 'curta')

    const submitBtn = screen.getByTestId('briefforge-send-button')
    await user.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Resposta muito curta/)
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('digitar 50 chars → contador mostra "50/2000"', async () => {
    const user = userEvent.setup()
    render(<AnswerInput onSubmit={onSubmit} />)

    const textarea = screen.getByTestId('briefforge-answer-input')
    const text50 = 'a'.repeat(50)
    await user.type(textarea, text50)

    expect(screen.getByText('50/2000')).toBeInTheDocument()
  })

  it('submit com texto válido → onSubmit chamado com texto trimmed', async () => {
    const user = userEvent.setup()
    render(<AnswerInput onSubmit={onSubmit} />)

    const textarea = screen.getByTestId('briefforge-answer-input')
    const validText = 'Esta é uma resposta válida com mais de dez caracteres'
    await user.type(textarea, validText)

    const submitBtn = screen.getByTestId('briefforge-send-button')
    await user.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(validText)
    })
  })

  it('isLoading=true → textarea e botão desabilitados', () => {
    render(<AnswerInput onSubmit={onSubmit} isLoading />)

    const textarea = screen.getByTestId('briefforge-answer-input')
    const submitBtn = screen.getByTestId('briefforge-send-button')

    expect(textarea).toBeDisabled()
    expect(submitBtn).toBeDisabled()
  })

  it('Ctrl+Enter com texto válido → onSubmit disparado', async () => {
    const user = userEvent.setup()
    render(<AnswerInput onSubmit={onSubmit} />)

    const textarea = screen.getByTestId('briefforge-answer-input')
    const validText = 'Uma resposta completa e detalhada para o briefing'
    await user.type(textarea, validText)

    await user.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(validText)
    })
  })

  it('campo reseta após submit bem-sucedido', async () => {
    const user = userEvent.setup()
    render(<AnswerInput onSubmit={onSubmit} />)

    const textarea = screen.getByTestId('briefforge-answer-input') as HTMLTextAreaElement
    const validText = 'Esta é uma resposta válida com mais de dez caracteres'
    await user.type(textarea, validText)

    const submitBtn = screen.getByTestId('briefforge-send-button')
    await user.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(textarea.value).toBe('')
    })

    expect(screen.getByText('0/2000')).toBeInTheDocument()
  })
})
