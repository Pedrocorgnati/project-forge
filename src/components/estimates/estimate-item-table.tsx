'use client'

import { useState, useMemo } from 'react'
import { formatCurrency, formatHours } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { EstimateItemProps } from '@/types/estimate-ui'

type SortKey = 'category' | 'costMin' | 'costMax'
type SortDir = 'asc' | 'desc'

interface EstimateItemTableProps {
  items: EstimateItemProps[]
  className?: string
}

const CATEGORY_LABEL: Record<string, string> = {
  'backend-api': 'Backend / API',
  'frontend-component': 'Frontend',
  'infrastructure': 'Infraestrutura',
  'database': 'Banco de Dados',
  'testing': 'Testes',
  'design': 'Design',
  'devops': 'DevOps',
  'integration': 'Integrações',
}

function getCategoryLabel(cat: string) {
  return CATEGORY_LABEL[cat] ?? cat
}

export function EstimateItemTable({ items, className }: EstimateItemTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('category')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortKey] as string | number
      const bVal = b[sortKey] as string | number
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [items, sortKey, sortDir])

  // Group by category for subtotals
  const grouped = useMemo(() => {
    const map = new Map<string, EstimateItemProps[]>()
    for (const item of sorted) {
      const arr = map.get(item.category) ?? []
      arr.push(item)
      map.set(item.category, arr)
    }
    return map
  }, [sorted])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-30" aria-hidden="true" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" aria-hidden="true" />
      : <ChevronDown className="h-3 w-3" aria-hidden="true" />
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm border-collapse min-w-[640px]">
        <caption className="sr-only">Tabela de itens da estimativa com horas mínimas, máximas, fator de risco e custos</caption>
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th
              scope="col"
              className="py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('category')}
              aria-sort={sortKey === 'category' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1">
                Categoria <SortIcon col="category" />
              </span>
            </th>
            <th scope="col" className="py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Descrição
            </th>
            <th scope="col" className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              H. Mín
            </th>
            <th scope="col" className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              H. Máx
            </th>
            <th scope="col" className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Risco
            </th>
            <th
              scope="col"
              className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('costMin')}
              aria-sort={sortKey === 'costMin' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1 justify-end">
                Custo Mín <SortIcon col="costMin" />
              </span>
            </th>
            <th
              scope="col"
              className="py-2 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground"
              onClick={() => toggleSort('costMax')}
              aria-sort={sortKey === 'costMax' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <span className="inline-flex items-center gap-1 justify-end">
                Custo Máx <SortIcon col="costMax" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from(grouped.entries()).map(([category, catItems]) => {
            const subtotalMin = catItems.reduce((s, i) => s + i.costMin, 0)
            const subtotalMax = catItems.reduce((s, i) => s + i.costMax, 0)
            return (
              <>
                <tr key={`group-${category}`} className="bg-slate-50 dark:bg-slate-800/50">
                  <td
                    colSpan={7}
                    className="py-1.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  >
                    {getCategoryLabel(category)}
                    <span className="ml-2 font-normal text-[10px] opacity-70">
                      ({formatCurrency(subtotalMin)} – {formatCurrency(subtotalMax)})
                    </span>
                  </td>
                </tr>
                {catItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-2 px-3 text-xs text-muted-foreground">{getCategoryLabel(item.category)}</td>
                    <td className="py-2 px-3 max-w-[240px]">
                      <p className="truncate" title={item.description}>{item.description}</p>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatHours(item.hoursMin)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatHours(item.hoursMax)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs font-mono">
                      ×{item.riskFactor.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(item.costMin)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(item.costMax)}</td>
                  </tr>
                ))}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
