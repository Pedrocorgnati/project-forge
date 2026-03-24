import type { PrismaClient } from '@prisma/client'
import type { ApiResponse, PaginatedResult } from '@/types'
import { ServiceError } from '@/types/utils'

// ─── BASE SERVICE ─────────────────────────────────────────────────────────────

/**
 * Classe base para todos os services da aplicação.
 * Fornece métodos utilitários padronizados para construir ApiResponse<T>
 * e wrappers de execução com tratamento de erro centralizado.
 */
export abstract class BaseService {
  constructor(protected readonly db: PrismaClient) {}

  // ── Construtores de resposta ───────────────────────────────────────────────

  protected success<T>(data: T): ApiResponse<T> {
    return { data, error: null }
  }

  protected failure<T>(
    code: string,
    message: string,
    details?: unknown,
  ): ApiResponse<T> {
    return { data: null, error: { code, message, details } }
  }

  protected paginate<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
  ): ApiResponse<PaginatedResult<T>> {
    return { data: { items, total, page, pageSize }, error: null }
  }

  // ── Wrapper de execução segura ─────────────────────────────────────────────

  /**
   * Executa uma operação de banco de dados com tratamento de erro padronizado.
   * Converte erros Prisma conhecidos em ApiResponse de erro.
   */
  protected async execute<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<ApiResponse<T>> {
    try {
      const result = await fn()
      return this.success(result)
    } catch (err) {
      if (err instanceof ServiceError) {
        return this.failure(err.code, err.message)
      }

      // Prisma: registro não encontrado
      if (isPrismaNotFound(err)) {
        return this.failure('NOT_FOUND', `${operation}: registro não encontrado`)
      }

      // Prisma: violação de constraint única
      if (isPrismaUniqueViolation(err)) {
        return this.failure('CONFLICT', `${operation}: registro já existe`)
      }

      // Prisma: violação de foreign key
      if (isPrismaForeignKeyViolation(err)) {
        return this.failure('INVALID_REFERENCE', `${operation}: referência inválida`)
      }

      return this.failure(
        'INTERNAL_ERROR',
        `Erro interno em ${operation}`,
        err instanceof Error ? err.message : err,
      )
    }
  }
}

// ─── HELPERS PRISMA ───────────────────────────────────────────────────────────

function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === code
  )
}

function isPrismaNotFound(err: unknown): boolean {
  return isPrismaError(err, 'P2025')
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return isPrismaError(err, 'P2002')
}

function isPrismaForeignKeyViolation(err: unknown): boolean {
  return isPrismaError(err, 'P2003')
}
