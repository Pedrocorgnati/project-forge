/**
 * Contract Test: Prisma Schema Consistency
 *
 * Valida que o schema Prisma está consistente e todos os modelos
 * críticos existem no Prisma Client gerado (DMMF).
 *
 * Nota: Usa DMMF estático — não requer banco ativo.
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import { Prisma } from '@prisma/client'

type DMMFModel = { name: string; fields: Array<{ name: string; kind?: string; type?: string; relationName?: string | null }> }

describe('Prisma Schema Consistency', () => {
  it('schema Prisma é válido (npx prisma validate)', () => {
    expect(() => {
      execSync('npx prisma validate', {
        stdio: 'pipe',
        encoding: 'utf-8',
      })
    }).not.toThrow()
  })

  it('todos os modelos principais existem no DMMF do Prisma Client', () => {
    const expectedModels = [
      'Project',
      'User',
      'Organization',
      'Brief',
      'BriefSession',
      'PRDDocument',
      'Estimate',
      'EstimateVersion',
      'Task',
      'ChangeOrder',
      'TimesheetEntry',
      'ProfitReport',
      'ApprovalRequest',
      'Event',
      'Notification',
      'RAGIndex',
      'ClientAccess',
    ] as const

    const existingModels = new Set(
      Prisma.dmmf.datamodel.models.map((m: DMMFModel) => m.name),
    )
    const missingModels: string[] = []

    for (const model of expectedModels) {
      if (!existingModels.has(model)) {
        missingModels.push(model)
      }
    }

    if (missingModels.length > 0) {
      console.log('\n  Modelos ausentes no Prisma Client:')
      missingModels.forEach((m) => console.log(`    - ${m}`))
    }

    expect(missingModels).toHaveLength(0)
  })

  it('modelo Project tem os campos cross-rock obrigatórios', () => {
    const projectModel = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'Project',
    )
    expect(projectModel).toBeDefined()

    const fieldNames = projectModel!.fields.map((f: DMMFModel['fields'][0]) => f.name)

    // Campos presentes na implementação real (verificados no schema.prisma)
    const requiredFields = [
      'id',
      'name',
      'status',
      'revenue',       // Rock 6: Rentabilia
      'totalHours',    // Rock 6: Rentabilia (denormalizado)
      'baseHours',     // Rock 3: ScopeShield
      'hourlyRate',    // Rock 2/3: EstimAI / ScopeShield
      'createdAt',
      'updatedAt',
    ]

    for (const field of requiredFields) {
      expect(
        fieldNames,
        `Campo '${field}' ausente no modelo Project`,
      ).toContain(field)
    }
  })

  it('modelo ApprovalRequest tem campo slaDeadline', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'ApprovalRequest',
    )
    expect(model).toBeDefined()
    const fieldNames = model!.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('slaDeadline')
  })

  it('modelo PRDDocument não tem campo updatedAt (design imutável)', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'PRDDocument',
    )
    expect(model).toBeDefined()
    const fieldNames = model!.fields.map((f: DMMFModel['fields'][0]) => f.name)
    // PRDDocument é imutável — não deve ter updatedAt
    expect(fieldNames).not.toContain('updatedAt')
  })

  it('modelo Event tem os campos necessários para o EventBus', () => {
    const model = Prisma.dmmf.datamodel.models.find((m: DMMFModel) => m.name === 'Event')
    expect(model).toBeDefined()
    const fieldNames = model!.fields.map((f: DMMFModel['fields'][0]) => f.name)

    const requiredFields = ['id', 'type', 'projectId', 'payload', 'sourceModule', 'processedAt', 'createdAt']
    for (const field of requiredFields) {
      expect(
        fieldNames,
        `Campo '${field}' ausente no modelo Event`,
      ).toContain(field)
    }
  })
})
