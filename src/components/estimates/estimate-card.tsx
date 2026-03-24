'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatHours, formatDate } from '@/lib/utils/format'
import { EstimateStatusBadge } from './estimate-status-badge'
import { ConfidenceBadge } from './confidence-badge'
import { cn } from '@/lib/utils'
import { HOURLY_RATE_BRL } from '@/lib/constants/billing'
import type { EstimateCardProps } from '@/types/estimate-ui'

export function EstimateCard({ estimate, className }: EstimateCardProps) {
  const isReady = estimate.status === 'READY'
  const isGenerating = estimate.status === 'GENERATING'

  return (
    <Card
      className={cn(
        'transition-shadow hover:shadow-md',
        estimate.status === 'ARCHIVED' && 'opacity-60',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-muted-foreground">
            v{estimate.version}
          </span>
          <EstimateStatusBadge status={estimate.status} />
        </div>
        {isReady && <ConfidenceBadge confidence={estimate.confidence} />}
      </CardHeader>

      <CardContent className="space-y-3">
        {isGenerating ? (
          <div className="space-y-2 animate-pulse" aria-label="Gerando estimativa…">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Horas estimadas</p>
              <p className="text-lg font-bold">
                {formatHours(estimate.totalMin)} – {formatHours(estimate.totalMax)}
              </p>
            </div>
            {isReady && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Custo estimado</p>
                <p className="text-base font-semibold text-primary">
                  {formatCurrency(estimate.totalMin * HOURLY_RATE_BRL)} – {formatCurrency(estimate.totalMax * HOURLY_RATE_BRL)}
                </p>
              </div>
            )}
            {estimate._count !== undefined && (
              <p className="text-xs text-muted-foreground">
                {estimate._count.items} {estimate._count.items === 1 ? 'item' : 'itens'} na estimativa
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Criado em {formatDate(estimate.createdAt)}
            </p>
          </>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        {isReady && (
          <Link
            href={ROUTES.PROJECT_ESTIMATE_DETAIL(estimate.projectId, estimate.id)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-brand hover:bg-brand text-white"
          >
            Ver detalhes
          </Link>
        )}
        {isGenerating && (
          <Button disabled variant="outline" size="sm" className="flex-1">
            <span className="animate-spin mr-2 inline-block" aria-hidden="true">⟳</span>
            Gerando…
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
