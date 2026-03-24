import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle, Archive } from 'lucide-react'
import type { EstimateStatus } from '@/types/estimate-ui'

const statusConfig: Record<
  EstimateStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  GENERATING: {
    label: 'Gerando',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  READY: {
    label: 'Pronto',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  ARCHIVED: {
    label: 'Arquivado',
    icon: Archive,
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
}

interface EstimateStatusBadgeProps {
  status: EstimateStatus
  className?: string
}

export function EstimateStatusBadge({ status, className }: EstimateStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      className={cn('flex items-center gap-1 font-medium', config.className, className)}
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={cn('h-3 w-3', status === 'GENERATING' && 'animate-spin')} />
      {config.label}
    </Badge>
  )
}
