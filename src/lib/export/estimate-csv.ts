import 'client-only'

interface EstimateItemForExport {
  category: string
  description: string
  hoursMin: number
  hoursMax: number
  hourlyRate: number
  riskFactor: number
  costMin: number
  costMax: number
}

interface ExportOptions {
  projectName: string
  version: number
  currency?: string
}

export function exportEstimateCsv(items: EstimateItemForExport[], opts: ExportOptions) {
  const headers = [
    'Categoria',
    'Descrição',
    'Horas Mínimas',
    'Horas Máximas',
    'Horas Médias',
    'Taxa Horária (R$)',
    'Fator de Risco',
    'Custo Mínimo (R$)',
    'Custo Máximo (R$)',
    'Custo Médio (R$)',
  ]

  const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`

  const rows = items.map((item) => [
    escapeCell(item.category),
    escapeCell(item.description),
    item.hoursMin.toFixed(1),
    item.hoursMax.toFixed(1),
    ((item.hoursMin + item.hoursMax) / 2).toFixed(1),
    item.hourlyRate.toFixed(2),
    item.riskFactor.toFixed(2),
    item.costMin.toFixed(2),
    item.costMax.toFixed(2),
    ((item.costMin + item.costMax) / 2).toFixed(2),
  ])

  const totals = [
    'TOTAL',
    '',
    items.reduce((s, i) => s + i.hoursMin, 0).toFixed(1),
    items.reduce((s, i) => s + i.hoursMax, 0).toFixed(1),
    items.reduce((s, i) => s + (i.hoursMin + i.hoursMax) / 2, 0).toFixed(1),
    '',
    '',
    items.reduce((s, i) => s + i.costMin, 0).toFixed(2),
    items.reduce((s, i) => s + i.costMax, 0).toFixed(2),
    items.reduce((s, i) => s + (i.costMin + i.costMax) / 2, 0).toFixed(2),
  ]

  const csv = [headers.join(','), ...rows.map((r) => r.join(',')), totals.join(',')].join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const slug = opts.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const link = document.createElement('a')
  link.href = url
  link.download = `estimativa-${slug}-v${opts.version}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
