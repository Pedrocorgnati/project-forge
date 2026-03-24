// ─── TIPOS UTILITÁRIOS ───────────────────────────────────────────────────────

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type WithId<T> = T & { id: string }
export type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date }

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type StringRecord = Record<string, string>
export type UnknownRecord = Record<string, unknown>
export type AnyFunction = (...args: unknown[]) => unknown

export type ValueOf<T> = T[keyof T]
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T]

// ─── CLASSE BASE DE ERRO ─────────────────────────────────────────────────────

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly operation?: string,
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
