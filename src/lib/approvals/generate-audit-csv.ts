// src/lib/approvals/generate-audit-csv.ts
// module-17-clientportal-approvals / TASK-5 ST001
// Helper para geração de CSV do audit trail de aprovações
// Rastreabilidade: INT-111

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface AuditEntry {
  approvalTitle: string
  approvalType: string
  action: string
  actorEmail: string | null
  comment: string | null
  createdAt: Date
}

function escapeCell(value: string): string {
  // Se contém vírgula, aspas ou quebra de linha, envolve em aspas e escapa aspas internas
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateAuditCSV(entries: AuditEntry[]): string {
  const header = ['Data/Hora', 'Aprovação', 'Tipo', 'Ação', 'Responsável', 'Comentário']

  const rows = entries.map((e) => [
    format(new Date(e.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
    escapeCell(e.approvalTitle),
    e.approvalType,
    e.action,
    e.actorEmail ?? 'Sistema (automático)',
    e.comment ? escapeCell(e.comment) : '',
  ])

  const lines = [header.join(','), ...rows.map((r) => r.join(','))]
  return lines.join('\n')
}
