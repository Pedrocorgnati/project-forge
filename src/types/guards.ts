import { UserRole } from '@prisma/client'
import type { ApiError, ApiResponse } from './api'
import type { AuthUser } from './entities'

export const isApiError = (v: unknown): v is ApiError =>
  typeof v === 'object' && v !== null && 'code' in v && 'message' in v

export const isApiSuccess = <T>(v: ApiResponse<T>): v is { data: T; error: null } =>
  v.error === null

export const isAuthUser = (v: unknown): v is AuthUser =>
  typeof v === 'object' &&
  v !== null &&
  'id' in v &&
  'email' in v &&
  'role' in v

export const hasRole = (user: AuthUser, role: UserRole) => user.role === role
export const isSocio = (user: AuthUser) => user.role === UserRole.SOCIO
export const isPM = (user: AuthUser) => user.role === UserRole.PM
export const isDev = (user: AuthUser) => user.role === UserRole.DEV
export const isCliente = (user: AuthUser) => user.role === UserRole.CLIENTE

export const isNonNullable = <T>(v: T | null | undefined): v is T => v != null

export const isString = (v: unknown): v is string => typeof v === 'string'
export const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && !Number.isNaN(v)
export const isPositiveNumber = (v: unknown): v is number =>
  isNumber(v) && v > 0
export const isValidDate = (v: unknown): v is Date =>
  v instanceof Date && !Number.isNaN(v.getTime())
