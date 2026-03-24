// ─── CHANGE ORDER LIST ────────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2 / ST001
// Rastreabilidade: INT-074

'use client'

import { useState } from 'react'
import { useChangeOrders } from '@/hooks/use-change-orders'
import { ChangeOrderCard } from './ChangeOrderCard'
import { CreateChangeOrderModal } from './CreateChangeOrderModal'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/skeleton'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Plus, FileDiff } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'PENDING_APPROVAL', label: 'Aguardando Aprovação' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Rejeitadas' },
]

interface ChangeOrderListProps {
  projectId: string
  userRole: string
  userId: string
}

export function ChangeOrderList({ projectId, userRole, userId }: ChangeOrderListProps) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)

  const { changeOrders, loading, error, refresh } = useChangeOrders(
    projectId,
    statusFilter !== 'all' ? statusFilter : undefined,
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center justify-between flex-wrap">
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-56"
          aria-label="Filtrar por status"
        />

        <PermissionGate role={['PM', 'SOCIO']}>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Nova Change Order
          </Button>
        </PermissionGate>
      </div>

      {loading ? (
        <LoadingSpinner centered label="Carregando change orders..." />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
          <p>{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="mt-2 text-red-600 dark:text-red-400"
          >
            Tentar novamente
          </Button>
        </div>
      ) : changeOrders.length === 0 ? (
        <EmptyState
          icon={<FileDiff />}
          title="Nenhuma change order encontrada"
          description="Mudanças de escopo aprovadas aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {changeOrders.map(co => (
            <ChangeOrderCard
              key={co.id}
              changeOrder={co}
              projectId={projectId}
              userRole={userRole}
              userId={userId}
              onUpdated={refresh}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateChangeOrderModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}
    </div>
  )
}
