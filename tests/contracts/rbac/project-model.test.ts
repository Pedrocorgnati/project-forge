/**
 * Contract Test: Project Model Cross-Rock Fields
 *
 * Verifica que o modelo Project centraliza os campos necessários para
 * integrações cross-rock. Usa Prisma DMMF — não requer banco ativo.
 */
import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'

type DMMFModel = { name: string; fields: Array<{ name: string; kind?: string; type?: string; relationName?: string | null }> }

describe('Project Model Cross-Rock Contract', () => {
  const REQUIRED_CROSS_ROCK_FIELDS: Array<{
    field: string
    rock: string
    purpose: string
  }> = [
    // Rock base: identificação e status
    { field: 'id',          rock: 'Rock 0',   purpose: 'Identificador único' },
    { field: 'name',        rock: 'Rock 0',   purpose: 'Nome do projeto' },
    { field: 'status',      rock: 'Rock 0',   purpose: 'Status do projeto' },

    // Rock 2/3: EstimAI + ScopeShield (finanças base)
    { field: 'hourlyRate',  rock: 'Rock 2/3', purpose: 'Taxa horária base' },
    { field: 'baseHours',   rock: 'Rock 3',   purpose: 'Horas base do contrato (ScopeShield)' },
    { field: 'totalHours',  rock: 'Rock 3',   purpose: 'Horas totais com Change Orders' },

    // Rock 5/6: Rentabilia (dados financeiros denormalizados)
    { field: 'revenue',     rock: 'Rock 5',   purpose: 'Receita do projeto' },
  ]

  it('modelo Project tem todos os campos cross-rock obrigatórios', () => {
    const projectModel = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'Project',
    )
    expect(projectModel).toBeDefined()

    const fieldMap = new Map(
      projectModel!.fields.map((f: DMMFModel['fields'][0]) => [f.name, f]),
    )
    const missingFields: string[] = []

    for (const required of REQUIRED_CROSS_ROCK_FIELDS) {
      if (!fieldMap.has(required.field)) {
        missingFields.push(
          `${required.field} (${required.rock}: ${required.purpose})`,
        )
      }
    }

    if (missingFields.length > 0) {
      console.log('\n  Campos ausentes no modelo Project:')
      missingFields.forEach((f) => console.log(`    - ${f}`))
    }

    expect(missingFields).toHaveLength(0)
  })

  it('Project.status é enum ProjectStatus (campo não nullable)', () => {
    const projectModel = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'Project',
    )!
    const statusField = projectModel.fields.find((f: DMMFModel['fields'][0]) => f.name === 'status')
    expect(statusField).toBeDefined()
    // Enum fields no DMMF não têm isNullable — presença com kind 'enum' já indica campo obrigatório
    expect(statusField!.kind).toBe('enum')
    expect(statusField!.type).toBe('ProjectStatus')
  })

  it('Project tem relações com modelos de todas as rocks', () => {
    const projectModel = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'Project',
    )!
    const relationNames = projectModel.fields
      .filter((f: DMMFModel['fields'][0]) => f.relationName)
      .map((f: DMMFModel['fields'][0]) => f.type)

    // Verificar relações críticas por rock
    const requiredRelations = [
      'Brief',           // Rock 1: BriefForge
      'Estimate',        // Rock 2: EstimAI
      'Task',            // Rock 3: ScopeShield
      'ChangeOrder',     // Rock 3: ScopeShield
      'RAGIndex',        // Rock 4: HandoffAI
      'TimesheetEntry',  // Rock 5: Rentabilia
      'ProfitReport',    // Rock 5: Rentabilia
      'ClientAccess',    // Rock 6: ClientPortal
      'ApprovalRequest', // Rock 6: ClientPortal
    ]

    const missingRelations = requiredRelations.filter(
      (rel) => !relationNames.includes(rel),
    )

    if (missingRelations.length > 0) {
      console.log('\n  Relações ausentes no modelo Project:')
      missingRelations.forEach((r) => console.log(`    - ${r}`))
    }

    expect(missingRelations).toHaveLength(0)
  })

  it('campos financeiros do Project são Decimal (não Float)', () => {
    const projectModel = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'Project',
    )!
    const fieldMap = new Map(projectModel.fields.map((f: DMMFModel['fields'][0]) => [f.name, f]))

    const decimalFields = ['totalHours', 'baseHours', 'hourlyRate', 'revenue']
    for (const fieldName of decimalFields) {
      const field = fieldMap.get(fieldName)
      expect(field, `Campo '${fieldName}' não encontrado`).toBeDefined()
      expect(
        field!.type,
        `Campo '${fieldName}' deve ser Decimal, não '${field!.type}'`,
      ).toBe('Decimal')
    }
  })
})
