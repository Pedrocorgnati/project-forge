'use client'

// ─── SCOPE ALERT LIST ────────────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-3
// Rastreabilidade: INT-069

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Select } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useScopeAlerts } from '@/hooks/use-scope-alerts'
import { ScopeAlertCard } from './ScopeAlertCard'

interface ScopeAlertListProps {
  projectId: string
  userRole: string
}

const typeOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'SCOPE_CREEP', label: 'Scope Creep' },
  { value: 'OUT_OF_SCOPE', label: 'Fora do Escopo' },
  { value: 'DUPLICATE', label: 'Duplicada' },
]

const statusOptions = [
  { value: 'OPEN', label: 'Abertos' },
  { value: 'ACKNOWLEDGED', label: 'Reconhecidos' },
  { value: 'DISMISSED', label: 'Dispensados' },
  { value: '', label: 'Todos os status' },
]

const emptyMessages: Record<string, { title: string; description: string }> = {
  OPEN: {
    title: 'Nenhum alerta aberto',
    description: 'Não há alertas de escopo pendentes neste projeto.',
  },
  ACKNOWLEDGED: {
    title: 'Nenhum alerta reconhecido',
    description: 'Nenhum alerta foi reconhecido ainda.',
  },
  DISMISSED: {
    title: 'Nenhum alerta dispensado',
    description: 'Nenhum alerta foi dispensado ainda.',
  },
  '': {
    title: 'Nenhum alerta encontrado',
    description: 'Não há alertas de escopo neste projeto.',
  },
}

export function ScopeAlertList({ projectId, userRole }: ScopeAlertListProps) {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('OPEN')

  const { alerts, loading, refresh } = useScopeAlerts(
    projectId,
    statusFilter || undefined,
  )

  const filteredAlerts = typeFilter
    ? alerts.filter((a) => a.type === typeFilter)
    : alerts

  const emptyMsg = emptyMessages[statusFilter] ?? emptyMessages['']

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-48">
          <label htmlFor="type-filter" className="sr-only">
            Filtrar por tipo
          </label>
          <Select
            id="type-filter"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrar por tipo de alerta"
          />
        </div>
        <div className="w-full sm:w-48">
          <label htmlFor="status-filter" className="sr-only">
            Filtrar por status
          </label>
          <Select
            id="status-filter"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status do alerta"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner centered label="Carregando alertas de escopo..." />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title={emptyMsg.title}
          description={emptyMsg.description}
          icon={<ShieldAlert className="w-full h-full" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <ScopeAlertCard
              key={alert.id}
              alert={alert}
              projectId={projectId}
              userRole={userRole}
              onUpdated={refresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}
