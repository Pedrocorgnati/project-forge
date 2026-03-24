// ─── RESPOSTA DE API ─────────────────────────────────────────────────────────

export type ApiError = {
  code: string
  message: string
  details?: unknown
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError }

// ─── PAGINAÇÃO ───────────────────────────────────────────────────────────────

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ─── ESTADO ASSÍNCRONO ───────────────────────────────────────────────────────

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

// ─── FILTROS E ORDENAÇÃO ─────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc'

export type PaginationParams = {
  page?: number
  pageSize?: number
}

export type SortParams = {
  sortBy?: string
  sortOrder?: SortOrder
}

export type QueryParams = PaginationParams & SortParams & Record<string, unknown>
