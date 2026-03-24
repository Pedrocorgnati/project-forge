'use client'

// src/components/cost-config/RateConfigTable.tsx
// module-14-rentabilia-timesheet / TASK-6
// Tabela de configuracoes de tarifa por role com acoes

import { useState } from 'react'
import { useCostConfig } from '@/hooks/use-cost-config'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format'
import { SetRateModal } from './SetRateModal'
import { UserRateOverrideModal } from './UserRateOverrideModal'
import { UserRole } from '@prisma/client'

interface RateConfigTableProps {
  projectId: string
}

const ROLE_LABELS: Record<string, string> = {
  [UserRole.SOCIO]: 'Socio',
  [UserRole.PM]: 'Project Manager',
  [UserRole.DEV]: 'Desenvolvedor',
  [UserRole.CLIENTE]: 'Cliente',
}

const ROLE_ORDER = [UserRole.SOCIO, UserRole.PM, UserRole.DEV, UserRole.CLIENTE]

export function RateConfigTable({ projectId }: RateConfigTableProps) {
  const { effectiveRates, configs, isLoading, error, refetch } = useCostConfig(projectId)
  const [setRateOpen, setSetRateOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton variant="text" lines={1} />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="card" className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Agrupar configs ativos por role
  const activeConfigsByRole = new Map<string, { hourlyRate: number; overrideCount: number }>()
  for (const config of configs) {
    if (!config.effectiveTo) {
      activeConfigsByRole.set(config.role, {
        hourlyRate: Number(config.hourlyRate),
        overrideCount: config.overrides.length,
      })
    }
  }

  // Membros por role (para o override modal)
  const membersByRole = new Map<string, Array<{ id: string; name: string }>>()
  for (const rate of effectiveRates) {
    const list = membersByRole.get(rate.role) ?? []
    list.push({ id: rate.userId, name: rate.userName })
    membersByRole.set(rate.role, list)
  }

  const handleEditRate = (role: string) => {
    setSelectedRole(role)
    setSetRateOpen(true)
  }

  const handleOverrides = (role: string) => {
    setSelectedRole(role)
    setOverrideOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Tarifas por Perfil
            </h2>
            <Badge variant="info">Somente SOCIO pode editar</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Perfil
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Tarifa/hora
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Overrides
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ORDER.map((role) => {
                  const config = activeConfigsByRole.get(role)
                  const isCliente = role === 'CLIENTE'
                  const rate = config?.hourlyRate ?? 0
                  const overrideCount = config?.overrideCount ?? 0

                  return (
                    <tr
                      key={role}
                      className="border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isCliente && rate === 0 ? (
                          <span className="text-slate-400 dark:text-slate-500 italic text-xs">
                            (não gera custo)
                          </span>
                        ) : config ? (
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {formatCurrency(rate)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic text-xs">
                            Não configurado
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {overrideCount > 0 ? (
                          <Badge variant="warning">{overrideCount}</Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRate(role)}
                          >
                            Editar tarifa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOverrides(role)}
                          >
                            Overrides
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SetRateModal
        open={setRateOpen}
        onOpenChange={setSetRateOpen}
        projectId={projectId}
        role={selectedRole}
        onSuccess={refetch}
      />

      <UserRateOverrideModal
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        projectId={projectId}
        role={selectedRole}
        members={membersByRole.get(selectedRole) ?? []}
        onSuccess={refetch}
      />
    </>
  )
}
