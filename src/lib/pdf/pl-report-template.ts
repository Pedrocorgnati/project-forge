import { formatCurrency } from '@/lib/utils/format'

// ─── PL REPORT HTML TEMPLATE ─────────────────────────────────────────────────

interface PLReportTemplateData {
  projectName: string
  projectId: string
  reportDate: string
  period: string
  revenue: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  billableHours: number
  teamCosts: Array<{
    userName: string
    role: string
    hours: number
    cost: number
    pctOfTotal: number
  }>
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPLReportHTML(data: PLReportTemplateData): string {
  const marginColor =
    data.marginPct > 40 ? '#16a34a' : data.marginPct > 20 ? '#d97706' : '#dc2626'

  const teamRows = data.teamCosts
    .map(
      (m) => `
      <tr>
        <td>${escapeHtml(m.userName)}</td>
        <td style="text-align:center">${escapeHtml(m.role)}</td>
        <td style="text-align:right">${m.hours.toFixed(1)}h</td>
        <td style="text-align:right">${formatCurrency(m.cost)}</td>
        <td style="text-align:right">${m.pctOfTotal.toFixed(0)}%</td>
      </tr>
    `,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 32px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; }
  .logo { font-size: 22px; font-weight: 700; color: #6366f1; }
  .title { font-size: 14px; color: #64748b; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .card-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .card-value { font-size: 22px; font-weight: 700; margin-top: 4px; }
  .margin-value { color: ${marginColor}; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 8px 4px; }
  td { font-size: 13px; border-bottom: 1px solid #f1f5f9; padding: 8px 4px; }
  .section-title { font-size: 14px; font-weight: 600; margin: 24px 0 8px; }
  .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ProjectForge</div>
      <div class="title">Relatório de Rentabilidade</div>
    </div>
    <div style="text-align:right; font-size:12px; color:#64748b">
      <div>Projeto: ${escapeHtml(data.projectName)}</div>
      <div>Período: ${escapeHtml(data.period)}</div>
      <div>Gerado em: ${escapeHtml(data.reportDate)}</div>
    </div>
  </div>

  <div class="summary">
    <div class="card">
      <div class="card-label">Receita Esperada</div>
      <div class="card-value">${formatCurrency(data.revenue)}</div>
    </div>
    <div class="card">
      <div class="card-label">Custo Acumulado</div>
      <div class="card-value">${formatCurrency(data.cost)}</div>
    </div>
    <div class="card">
      <div class="card-label">Margem Absoluta</div>
      <div class="card-value margin-value">${formatCurrency(data.margin)}</div>
    </div>
    <div class="card">
      <div class="card-label">Margem %</div>
      <div class="card-value margin-value">${data.marginPct.toFixed(1)}%</div>
    </div>
  </div>

  <div class="section-title">Decomposição por Equipe</div>
  <table>
    <thead>
      <tr>
        <th>Membro</th>
        <th style="text-align:center">Role</th>
        <th style="text-align:right">Horas</th>
        <th style="text-align:right">Custo</th>
        <th style="text-align:right">% do Total</th>
      </tr>
    </thead>
    <tbody>${teamRows}</tbody>
  </table>

  <div class="footer">
    Gerado pelo ProjectForge · ${escapeHtml(data.reportDate)} · Confidencial — uso interno
  </div>
</body>
</html>`
}
