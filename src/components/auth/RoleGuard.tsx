'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import type { UserRole } from '@prisma/client'

interface RoleGuardProps {
  roles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user || !roles.includes(user.role)) return fallback
  return children
}
