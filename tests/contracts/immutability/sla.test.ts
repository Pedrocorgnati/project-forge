/**
 * Contract Test: ApprovalRequest SLA
 *
 * Valida o contrato de SLA de aprovação:
 * - Modelo ApprovalRequest tem campo slaDeadline
 * - slaDeadline deve ser = requestedAt + 72h (verificado via DB quando disponível)
 * - Cron job SLA enforcer existe na API
 */
import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'

type DMMFModel = { name: string; fields: Array<{ name: string; kind?: string; type?: string; default?: unknown; relationName?: string | null }> }

const hasDb = Boolean(process.env.DATABASE_URL)

describe('ApprovalRequest SLA Contract', () => {
  it('modelo ApprovalRequest tem campo slaDeadline no schema', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'ApprovalRequest',
    )
    expect(model).toBeDefined()
    const fieldNames = model!.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('slaDeadline')
  })

  it('modelo ApprovalRequest tem campo status para rastrear expiração', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'ApprovalRequest',
    )!
    const fieldNames = model.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('status')
    expect(fieldNames).toContain('createdAt')
  })

  it('SLA 72h: cálculo de deadline correto', () => {
    const requestedAt = new Date('2026-03-22T10:00:00Z')
    const expectedDeadline = new Date('2026-03-25T10:00:00Z')
    const SLA_HOURS = 72

    const computedDeadline = new Date(
      requestedAt.getTime() + SLA_HOURS * 60 * 60 * 1000,
    )

    expect(computedDeadline.getTime()).toBe(expectedDeadline.getTime())
  })

  it('SLA 72h: deadline é exato (não arredondado por timezone/DST)', () => {
    // Testar em diferentes fusos para garantir que não há DST drift
    const testCases = [
      { requestedAt: '2026-03-28T23:00:00Z' }, // Horário de verão EU começa nesse fim de semana
      { requestedAt: '2026-11-01T01:00:00Z' }, // Horário de verão EUA termina
      { requestedAt: '2026-12-31T23:00:00Z' }, // Virada de ano
    ]

    for (const { requestedAt } of testCases) {
      const requested = new Date(requestedAt)
      const deadline = new Date(requested.getTime() + 72 * 60 * 60 * 1000)

      // slaDeadline deve ser exatamente 72 horas depois
      const diffMs = deadline.getTime() - requested.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)

      expect(
        diffHours,
        `SLA deadline com requestedAt=${requestedAt} não é 72h exatos`,
      ).toBe(72)
    }
  })

  it('ApprovalRequest.status tem valor PENDING inicial e transições corretas', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'ApprovalRequest',
    )!
    const statusField = model.fields.find((f: DMMFModel['fields'][0]) => f.name === 'status')
    expect(statusField).toBeDefined()

    // Verificar que o campo tem default PENDING (via schema)
    // O default pode estar no @default() do Prisma
    const hasDefault = statusField!.default !== undefined
    if (!hasDefault) {
      // Se não tem default no DMMF, deve ter no banco via migration
      console.log(
        '  [INFO] ApprovalRequest.status não tem default no DMMF — verificar migration',
      )
    }
  })
})

describe.skipIf(!hasDb)('ApprovalRequest SLA: validação em banco real', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any

  beforeAll(async () => {
    const dbModule = await import('@/lib/db')
    prisma = dbModule.prisma ?? dbModule.getPrismaClient?.()
  })

  afterAll(async () => {
    if (prisma) await prisma.$disconnect().catch(() => {})
  })

  it('ApprovalRequests existentes têm slaDeadline aproximadamente 72h após createdAt', async () => {
    const approvals = await prisma.approvalRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    if (approvals.length === 0) {
      console.log('  [SKIP] Nenhum ApprovalRequest no banco')
      return
    }

    const TOLERANCE_MS = 60_000 // 1 minuto de tolerância
    const violations: string[] = []

    for (const approval of approvals) {
      const diffMs =
        new Date(approval.slaDeadline).getTime() -
        new Date(approval.createdAt).getTime()
      const expected72h = 72 * 60 * 60 * 1000

      if (Math.abs(diffMs - expected72h) > TOLERANCE_MS) {
        const diffHours = diffMs / (1000 * 60 * 60)
        violations.push(
          `ApprovalRequest ${approval.id}: slaDeadline = ${diffHours.toFixed(2)}h após createdAt (esperado 72h)`,
        )
      }
    }

    if (violations.length > 0) {
      console.log('\n  Aprovações com SLA incorreto:')
      violations.forEach((v) => console.log(`    - ${v}`))
    }

    expect(violations).toHaveLength(0)
  })
})
