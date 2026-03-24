'use client'

import { Sparkles } from 'lucide-react'
import { EstimateCard } from './estimate-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { GenerateEstimateButton } from './generate-estimate-button'
import { useEstimateRealtime } from '@/hooks/estimates/use-estimate-realtime'
import type { EstimateCardProps } from '@/types/estimate-ui'

interface EstimateListClientProps {
  initialEstimates: EstimateCardProps['estimate'][]
  projectId: string
  userRole: string
}

const CAN_GENERATE_ROLES = ['SOCIO', 'PM']

export function EstimateListClient({
  initialEstimates,
  projectId,
  userRole,
}: EstimateListClientProps) {
  const { estimates, isLoading, isError } = useEstimateRealtime(projectId, initialEstimates)

  if (isLoading && estimates.length === 0) {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        aria-label="Carregando estimativas…"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth={1.5} />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth={2} />
          </svg>
        }
        title="Erro ao carregar estimativas"
        description="Não foi possível buscar as estimativas do projeto. Tente recarregar a página."
        action={{ label: 'Recarregar', onClick: () => window.location.reload() }}
      />
    )
  }

  if (estimates.length === 0) {
    const canGenerate = CAN_GENERATE_ROLES.includes(userRole)
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={<Sparkles className="h-12 w-12 text-muted-foreground" aria-hidden="true" />}
          title="Nenhuma estimativa ainda"
          description="Gere a primeira estimativa com base no brief do projeto. A IA analisará o escopo e criará uma estimativa detalhada com intervalos de horas e custos."
        />
        {canGenerate && <GenerateEstimateButton projectId={projectId} />}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {estimates.map((estimate: any) => (
        <EstimateCard key={estimate.id} estimate={estimate} />
      ))}
    </div>
  )
}
