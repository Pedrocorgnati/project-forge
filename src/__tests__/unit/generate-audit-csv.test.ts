// src/__tests__/unit/generate-audit-csv.test.ts
// module-17-clientportal-approvals / TASK-5 ST001
// Testes unitários do helper de geração de CSV do audit trail
// Rastreabilidade: INT-111

import { describe, it, expect } from 'vitest'
import { generateAuditCSV, type AuditEntry } from '@/lib/approvals/generate-audit-csv'

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    approvalTitle: 'Aprovação do PRD v1',
    approvalType: 'DOCUMENT',
    action: 'CREATED',
    actorEmail: 'pm@empresa.com',
    comment: null,
    createdAt: new Date('2026-01-05T14:30:00Z'),
    ...overrides,
  }
}

describe('generateAuditCSV', () => {
  it('gera cabeçalho correto na primeira linha', () => {
    const csv = generateAuditCSV([])
    const firstLine = csv.split('\n')[0]
    expect(firstLine).toBe('Data/Hora,Aprovação,Tipo,Ação,Responsável,Comentário')
  })

  it('CSV sem entradas retorna apenas o cabeçalho', () => {
    const csv = generateAuditCSV([])
    expect(csv.split('\n')).toHaveLength(1)
  })

  it('formata data em pt-BR (dd/MM/yyyy HH:mm:ss)', () => {
    const csv = generateAuditCSV([makeEntry({ createdAt: new Date('2026-01-05T14:30:00Z') })])
    const dataLine = csv.split('\n')[1]
    // UTC+0, ajuste depende de locale do server — verifica formato
    expect(dataLine).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/)
  })

  it('actorEmail preenchido → aparece como email na coluna Responsável', () => {
    const csv = generateAuditCSV([makeEntry({ actorEmail: 'pm@empresa.com' })])
    expect(csv).toContain('pm@empresa.com')
  })

  it('actorEmail null → aparece como "Sistema (automático)"', () => {
    const csv = generateAuditCSV([makeEntry({ actorEmail: null })])
    expect(csv).toContain('Sistema (automático)')
  })

  it('comment preenchido → aparece na coluna Comentário', () => {
    const csv = generateAuditCSV([makeEntry({ comment: 'Aprovado após revisão' })])
    expect(csv).toContain('Aprovado após revisão')
  })

  it('comment null → coluna Comentário fica vazia', () => {
    const csv = generateAuditCSV([makeEntry({ comment: null })])
    const dataLine = csv.split('\n')[1]
    // Última coluna deve ser vazia (termina em vírgula ou nada após última vírgula)
    expect(dataLine.endsWith(',')).toBe(true)
  })

  it('approvalTitle com vírgula → envolvido em aspas duplas', () => {
    const csv = generateAuditCSV([makeEntry({ approvalTitle: 'PRD, versão final' })])
    expect(csv).toContain('"PRD, versão final"')
  })

  it('approvalTitle com aspas → aspas escapadas (dobradas)', () => {
    const csv = generateAuditCSV([makeEntry({ approvalTitle: 'PRD "v1" final' })])
    expect(csv).toContain('"PRD ""v1"" final"')
  })

  it('comment com vírgula → envolvido em aspas duplas', () => {
    const csv = generateAuditCSV([makeEntry({ comment: 'Sim, aprovado com ressalvas' })])
    expect(csv).toContain('"Sim, aprovado com ressalvas"')
  })

  it('gera N linhas de dados para N entradas', () => {
    const entries = [makeEntry(), makeEntry({ action: 'APPROVED' }), makeEntry({ action: 'EXPIRED' })]
    const csv = generateAuditCSV(entries)
    expect(csv.split('\n')).toHaveLength(4) // 1 header + 3 dados
  })

  it('múltiplas entradas ordenadas mantêm a ordem recebida', () => {
    const entries = [
      makeEntry({ action: 'CREATED' }),
      makeEntry({ action: 'REMINDER_SENT' }),
      makeEntry({ action: 'APPROVED' }),
    ]
    const csv = generateAuditCSV(entries)
    const lines = csv.split('\n')
    expect(lines[1]).toContain('CREATED')
    expect(lines[2]).toContain('REMINDER_SENT')
    expect(lines[3]).toContain('APPROVED')
  })
})
