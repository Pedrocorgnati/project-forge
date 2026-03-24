// ─── TEAM COST BREAKDOWN ─────────────────────────────────────────────────────
// module-15-rentabilia-dashboard / TASK-6 / ST006
// Tabela expansível de custos por equipe, agrupada por role
// PM não vê coluna de taxa (showRates prop)

'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TeamMemberCost {
  userId: string
  userName: string
  role: string
  hours: number
  billableHours: number
  effectiveRate?: number
  cost: number
  pctOfTotal: number
}

interface TeamCostBreakdownProps {
  teamCosts: TeamMemberCost[]
  isLoading?: boolean
  showRates: boolean // false para PM
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-600', className)}
    >
      <div
        className="h-full rounded-full bg-brand"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function TeamCostBreakdown({ teamCosts, isLoading, showRates }: TeamCostBreakdownProps) {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set())

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Carregando breakdown de custos..."
        className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded-lg h-48"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (teamCosts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
        Nenhum custo registrado para o período selecionado
      </div>
    )
  }

  // Agrupar por role
  const byRole = teamCosts.reduce<Record<string, TeamMemberCost[]>>((acc, m) => {
    acc[m.role] = [...(acc[m.role] ?? []), m]
    return acc
  }, {})

  const totalCost = teamCosts.reduce((s, m) => s + m.cost, 0)

  const toggleRole = (role: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev)
      if (next.has(role)) {
        next.delete(role)
      } else {
        next.add(role)
      }
      return next
    })
  }

  const colCount = showRates ? 6 : 5

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-card overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
          Custo por Equipe
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Total: {formatCurrency(totalCost)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400 w-[200px]">
                Membro / Função
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                Horas
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                Faturável
              </th>
              {showRates && (
                <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                  Taxa (R$/h)
                </th>
              )}
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                Custo
              </th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400 w-[140px]">
                % do Total
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byRole).map(([role, members]) => {
              const roleTotalCost = members.reduce((s, m) => s + m.cost, 0)
              const roleTotalHours = members.reduce((s, m) => s + m.hours, 0)
              const rolePct = totalCost > 0 ? (roleTotalCost / totalCost) * 100 : 0
              const isExpanded = expandedRoles.has(role)

              return [
                // Linha do role (agrupadora)
                <tr
                  key={`role-${role}`}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 font-medium"
                  onClick={() => toggleRole(role)}
                  aria-expanded={isExpanded}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      )}
                      <Badge variant="neutral">{role}</Badge>
                      <span className="text-xs text-slate-400">({members.length})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{roleTotalHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-slate-400">—</td>
                  {showRates && <td className="px-4 py-3 text-slate-400">—</td>}
                  <td className="px-4 py-3 font-semibold">{formatCurrency(roleTotalCost)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={rolePct} />
                      <span className="text-xs text-slate-500">{rolePct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>,

                // Linhas dos membros (expansíveis)
                ...(isExpanded
                  ? members.map((member) => (
                      <tr
                        key={`member-${member.userId}`}
                        className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-2.5 pl-12 text-sm text-slate-500 dark:text-slate-400">
                          {member.userName}
                        </td>
                        <td className="px-4 py-2.5 text-sm">{member.hours.toFixed(1)}h</td>
                        <td className="px-4 py-2.5 text-sm">{member.billableHours.toFixed(1)}h</td>
                        {showRates && (
                          <td className="px-4 py-2.5 text-sm font-mono">
                            {formatCurrency(member.effectiveRate ?? 0)}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-sm">{formatCurrency(member.cost)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={member.pctOfTotal} />
                            <span className="text-xs text-slate-500">
                              {member.pctOfTotal.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  : []),
              ]
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
