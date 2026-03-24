import { toast } from 'sonner'
import type { ApiError } from '@/types'

// ─── TRATAMENTO CENTRALIZADO DE ERROS DE API ─────────────────────────────────

/**
 * Processa um ApiError e exibe toast de erro.
 * Redireciona para login se o erro for de autenticação (401).
 *
 * @param error - ApiError vindo de ApiResponse
 * @param options - Configurações opcionais
 */
export function handleApiError(
  error: ApiError,
  options: {
    /** Ação executada no momento do erro (para contexto no toast) */
    action?: string
    /** Sobrescreve a mensagem exibida */
    message?: string
    /** Se false, não exibe toast (ex: erros silenciosos) */
    showToast?: boolean
    /** Callback executado após o toast */
    onError?: (error: ApiError) => void
  } = {},
): void {
  const { action, message, showToast = true, onError } = options

  // Redirecionar para login em erros de autenticação
  if (error.code === 'HTTP_401' || error.code === 'UNAUTHENTICATED') {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return
  }

  if (showToast) {
    const description = action ? `Erro ao ${action}` : undefined
    toast.error(message ?? error.message, { description })
  }

  onError?.(error)
}

/**
 * Extrai mensagem legível de um erro desconhecido.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return (error as { message: string }).message
  }
  return 'Erro desconhecido'
}
