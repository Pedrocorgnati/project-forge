import { cn } from '@/lib/utils'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export function Badge({ variant = 'neutral', dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full',
        variantClasses[variant],
        className
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

// Status → badge variant mapping
export function getStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    // ProjectStatus
    BRIEFING: 'info',
    ESTIMATION: 'info',
    APPROVED: 'success',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    ARCHIVED: 'neutral',
    // DocumentStatus
    DRAFT: 'neutral',
    PENDING_APPROVAL: 'warning',
    REJECTED: 'error',
    OBSOLETE: 'neutral',
    // ChangeOrderStatus
    SENT: 'info',
    EXPIRED: 'error',
    // TaskStatus
    TODO: 'neutral',
    DONE: 'success',
    BLOCKED: 'error',
    // Generic
    active: 'success',
    pending: 'warning',
    archived: 'neutral',
    cancelled: 'error',
    draft: 'neutral',
    approved: 'success',
    in_review: 'info',
    rejected: 'error',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }
  return map[status] ?? 'neutral'
}

export const statusLabel: Record<string, string> = {
  BRIEFING: 'Briefing',
  ESTIMATION: 'Estimativa',
  APPROVED: 'Aprovado',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
  ARCHIVED: 'Arquivado',
  DRAFT: 'Rascunho',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  REJECTED: 'Rejeitado',
  OBSOLETE: 'Obsoleto',
  TODO: 'A Fazer',
  DONE: 'Concluído',
  BLOCKED: 'Bloqueado',
  SENT: 'Enviado',
  EXPIRED: 'Expirado',
  active: 'Ativo',
  pending: 'Pendente',
  archived: 'Arquivado',
  cancelled: 'Cancelado',
  draft: 'Rascunho',
  approved: 'Aprovado',
  in_review: 'Em Revisão',
  rejected: 'Rejeitado',
}
