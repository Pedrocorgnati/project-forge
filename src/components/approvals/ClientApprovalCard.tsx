'use client'

// src/components/approvals/ClientApprovalCard.tsx
// module-17-clientportal-approvals / TASK-7 ST001
// Card de aprovacao na perspectiva do cliente
// Rastreabilidade: INT-107

import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { FileText, CheckSquare, Package } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SLACountdownBadge } from '@/components/approvals/SlaCountdownBadge'

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  DOCUMENT: { icon: FileText, label: 'Documento', color: 'text-blue-600 bg-blue-50' },
  MILESTONE: { icon: CheckSquare, label: 'Marco', color: 'text-green-600 bg-green-50' },
  DELIVERABLE: { icon: Package, label: 'Entrega', color: 'text-purple-600 bg-purple-50' },
}

interface ClientApprovalCardProps {
  approval: {
    id: string
    type: string
    title: string
    description: string
    status: string
    slaDeadline: string | Date
    respondedAt: string | Date | null
    createdAt: string | Date
    project: { name: string }
    requester: { name: string | null }
  }
  showRespondButton?: boolean
}

export function ClientApprovalCard({ approval, showRespondButton = false }: ClientApprovalCardProps) {
  const config = TYPE_CONFIG[approval.type] ?? TYPE_CONFIG.DOCUMENT
  const Icon = config.icon
  const isPending = approval.status === 'PENDING'
  const isApproved = approval.status === 'APPROVED'
  const isRejected = approval.status === 'REJECTED'

  return (
    <Card
      className={cn(
        'transition-colors',
        isPending && 'border-amber-300 dark:border-amber-600'
      )}
    >
      <CardContent className="space-y-3">
        {/* Header: type + SLA */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-md', config.color)}>
              <Icon className="w-4 h-4" />
            </span>
            <Badge variant="neutral">{config.label}</Badge>
          </div>
          <SLACountdownBadge
            slaDeadline={new Date(approval.slaDeadline)}
            status={approval.status}
          />
        </div>

        {/* Title + project */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {approval.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {approval.project.name}
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
          {approval.description}
        </p>

        {/* Footer: requester + date + action */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span>Solicitado por {approval.requester.name ?? 'Equipe'}</span>
            <span className="mx-1">·</span>
            <span>{format(new Date(approval.createdAt), "dd 'de' MMM yyyy", { locale: ptBR })}</span>
          </div>

          {isPending && showRespondButton && (
            <Link href={ROUTES.PORTAL_APPROVAL_DETAIL(approval.id)}>
              <Button size="sm" variant="primary">
                Revisar e responder
              </Button>
            </Link>
          )}

          {(isApproved || isRejected) && approval.respondedAt && (
            <Badge variant={isApproved ? 'success' : 'error'}>
              {isApproved ? 'Aprovado' : 'Rejeitado'} em{' '}
              {format(new Date(approval.respondedAt), "dd/MM/yyyy", { locale: ptBR })}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
