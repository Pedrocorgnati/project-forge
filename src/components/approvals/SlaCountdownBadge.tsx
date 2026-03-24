'use client'

// src/components/approvals/SlaCountdownBadge.tsx
// module-17-clientportal-approvals / TASK-6 ST001
// Badge visual de countdown do SLA com estados de cor
// Rastreabilidade: INT-107

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { getSLAStatus, getHoursRemaining } from '@/lib/sla/calculate-sla'

interface SLACountdownBadgeProps {
  slaDeadline: Date
  status: string
  className?: string
}

export function SLACountdownBadge({ slaDeadline, status, className }: SLACountdownBadgeProps) {
  // Status finais — não mostrar countdown
  if (status === 'APPROVED') {
    return (
      <Badge variant="success" className={className}>
        ✓ Aprovado
      </Badge>
    )
  }

  if (status === 'REJECTED') {
    return (
      <Badge variant="error" className={className}>
        ✗ Rejeitado
      </Badge>
    )
  }

  // Para PENDING (ou qualquer status não-final), calcular SLA
  const deadline = new Date(slaDeadline)
  const slaStatus = getSLAStatus(deadline)
  const hoursRemaining = getHoursRemaining(deadline)

  if (slaStatus === 'EXPIRED') {
    return (
      <Badge variant="neutral" className={className}>
        Expirado
      </Badge>
    )
  }

  if (slaStatus === 'HEALTHY') {
    return (
      <Badge variant="success" className={className}>
        {hoursRemaining}h restantes
      </Badge>
    )
  }

  if (slaStatus === 'WARNING') {
    return (
      <Badge variant="warning" className={className}>
        {hoursRemaining}h restantes
      </Badge>
    )
  }

  // CRITICAL — < 24h
  return (
    <Badge
      variant="error"
      className={cn('animate-pulse', className)}
    >
      {hoursRemaining}h restantes
    </Badge>
  )
}
