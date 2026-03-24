// ─── PL INSIGHTS PROMPT ──────────────────────────────────────────────────────

import { formatCurrency } from '@/lib/utils/format'

export interface PLInsightContext {
  revenue: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  billableRatio: number
  period: string
  teamCosts: Array<{ role: string; hours: number; cost: number; pctOfTotal: number }>
  burnRate?: {
    costPerDay: number
    projectedTotalCost: number
    isOverBudget: boolean
    daysRemaining: number | null
  }
}

export function buildPLInsightsPrompt(ctx: PLInsightContext): string {
  const teamSummary = ctx.teamCosts
    .map(t => `- ${t.role}: ${t.hours.toFixed(1)}h | ${formatCurrency(t.cost)} (${t.pctOfTotal.toFixed(0)}%)`)
    .join('\n')

  const burnRateSection = ctx.burnRate
    ? `
Burn Rate:
- Custo diário médio: ${formatCurrency(ctx.burnRate.costPerDay)}
- Custo projetado ao final: ${formatCurrency(ctx.burnRate.projectedTotalCost)}
- Dias restantes: ${ctx.burnRate.daysRemaining ?? 'não definido'}
- Risco de estourar orçamento: ${ctx.burnRate.isOverBudget ? 'SIM' : 'não'}
`
    : ''

  return `Você é um consultor sênior de gestão financeira de projetos de software. Analise os dados de P&L abaixo e forneça exatamente 4 insights acionáveis em português, priorizando riscos críticos primeiro.

DADOS DE P&L (${ctx.period}):
- Receita esperada: ${formatCurrency(ctx.revenue)}
- Custo acumulado: ${formatCurrency(ctx.cost)}
- Margem atual: ${formatCurrency(ctx.margin)} (${ctx.marginPct.toFixed(1)}%)
- Horas registradas: ${ctx.hoursLogged.toFixed(1)}h (${ctx.billableRatio.toFixed(0)}% faturáveis)

Decomposição por role:
${teamSummary}
${burnRateSection}
BENCHMARK DE MERCADO (referência):
- Margem saudável para projetos de software: 40-60%
- Ratio billable/total saudável: ≥ 70%
- Red flag de burn rate: projeção > 90% da receita

Formato de resposta: 4 bullets diretos e acionáveis, cada um com ≤ 2 frases. Sem introdução ou conclusão.`
}
