export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Extrai uma mensagem legível de qualquer tipo de erro.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Erro interno. Tente novamente.'
}

/**
 * Formata o retorno de erro para Server Actions.
 */
export function toActionError(error: unknown): { error: string; code?: string } {
  if (error instanceof AppError) {
    return { error: error.message, code: error.code }
  }
  return { error: getErrorMessage(error) }
}
