// ─── CHECKPOINT TIMELINE ─────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-7 / ST004
// Timeline visual de checkpoints de P&L com seleção para comparação

'use client'

import { useState } from 'react'
import { Flag, TrendingUp, TrendingDown, Minus, GitCompare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { useCheckpoints } from '@/hooks/use-checkpoints'
import { toast } from '@/components/ui/toast'
import { formatCurrency } from '@/lib/utils/format'
import { CheckpointComparison } from './CheckpointComparison'

interface CheckpointTimelineProps {
  projectId: string
  currentPL: {
    revenue: number
    cost: number
    margin: number
    marginPct: number
    hoursLogged: number
  }
}

export function CheckpointTimeline({ projectId, currentPL }: CheckpointTimelineProps) {
  const { checkpoints, isLoading, error, createCheckpoint, mutate } = useCheckpoints(projectId)
  const [comparing, setComparing] = useState<[string, string] | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateCheckpoint = async () => {
    setIsCreating(true)
    try {
      await createCheckpoint(undefined)
      await mutate()
      toast.success('Checkpoint criado', {
        description: 'Estado atual de P&L salvo como checkpoint',
      })
    } catch {
      toast.error('Não foi possível criar o checkpoint')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSelectForCompare = (checkpointId: string) => {
    if (!selectedForCompare) {
      setSelectedForCompare(checkpointId)
      toast.info('Selecione outro checkpoint para comparar')
    } else if (selectedForCompare === checkpointId) {
      setSelectedForCompare(null)
    } else {
      setComparing([selectedForCompare, checkpointId])
      setSelectedForCompare(null)
    }
  }

  if (comparing) {
    return (
      <CheckpointComparison
        projectId={projectId}
        checkpointAId={comparing[0]}
        checkpointBId={comparing[1]}
        onBack={() => setComparing(null)}
      />
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-medium text-sm">Checkpoints de P&L</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateCheckpoint}
          disabled={isCreating}
          className="gap-1.5"
          aria-label="Criar novo checkpoint de P&L"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {isCreating ? 'Criando...' : 'Novo checkpoint'}
        </Button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="p-4 space-y-3" aria-busy="true" aria-label="Carregando checkpoints">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-16" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div role="alert" className="mx-4 mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && checkpoints.length === 0 && (
        <EmptyState
          icon={<Flag className="w-full h-full" />}
          title="Sem checkpoints"
          description="Crie o primeiro checkpoint para salvar o estado atual do P&L"
          className="p-8"
        />
      )}

      {/* Lista de checkpoints */}
      {!isLoading && !error && checkpoints.length > 0 && (
        <div className="relative p-4">
          {/* Linha vertical da timeline */}
          <div className="absolute left-[28px] top-8 bottom-4 w-0.5 bg-border" aria-hidden="true" />

          <div className="space-y-4">
            {checkpoints.map((cp) => {
              const snap = cp.summary
              const isSelected = selectedForCompare === cp.id
              const marginStatus =
                snap.marginPct > 40 ? 'healthy' : snap.marginPct > 20 ? 'warning' : 'danger'
              const TrendIcon =
                snap.margin > 0 ? TrendingUp : snap.margin < 0 ? TrendingDown : Minus

              return (
                <div key={cp.id} className="flex gap-3 relative">
                  {/* Ícone da timeline */}
                  <div
                    className={[
                      'flex-none w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 bg-background',
                      marginStatus === 'healthy'
                        ? 'border-emerald-500'
                        : marginStatus === 'warning'
                          ? 'border-amber-500'
                          : 'border-red-500',
                      isSelected ? 'ring-2 ring-primary ring-offset-1' : '',
                    ].join(' ')}
                    aria-hidden="true"
                  >
                    <Flag className="h-3 w-3 text-muted-foreground" />
                  </div>

                  {/* Conteúdo do checkpoint */}
                  <div
                    className={`flex-1 rounded-lg border p-3 ${
                      isSelected ? 'border-primary bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{cp.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(cp.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Receita: </span>
                        <span className="font-medium">{formatCurrency(snap.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Custo: </span>
                        <span className="font-medium">{formatCurrency(snap.cost)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendIcon
                          className={`h-3 w-3 ${snap.margin > 0 ? 'text-emerald-500' : 'text-red-500'}`}
                          aria-hidden="true"
                        />
                        <span
                          className={`font-medium ${
                            snap.marginPct > 40
                              ? 'text-emerald-600'
                              : snap.marginPct > 20
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {snap.marginPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1 mt-2">
                      <Button
                        variant={isSelected ? 'primary' : 'ghost'}
                        size="sm"
                        className="h-6 text-xs gap-1 px-2"
                        onClick={() => handleSelectForCompare(cp.id)}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Desselecionar' : 'Selecionar'} checkpoint ${cp.name} para comparação`}
                      >
                        <GitCompare className="h-3 w-3" aria-hidden="true" />
                        {isSelected ? 'Selecionado' : 'Comparar'}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
