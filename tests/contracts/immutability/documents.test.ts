/**
 * Contract Test: Document Immutability
 *
 * Valida que modelos imutáveis (PRDDocument, EstimateVersion, ProfitReport)
 * não têm campo `updatedAt` no schema (design imutável append-only).
 *
 * Para validação HTTP (PUT/PATCH retornam 405), usar auth-contract.test.ts
 * com servidor ativo e token SOCIO.
 *
 * Não requer banco — usa Prisma DMMF.
 */
import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'

type DMMFModel = { name: string; fields: Array<{ name: string; kind?: string; type?: string; relationName?: string | null }> }

describe('Document Immutability Contract', () => {
  // Modelos que devem ser imutáveis (append-only — sem updatedAt)
  const IMMUTABLE_MODELS = [
    'PRDDocument',
    'EstimateVersion',
    'ProfitReport',
  ] as const

  it.each(IMMUTABLE_MODELS)(
    '%s não tem campo updatedAt (design append-only)',
    (modelName) => {
      const model = Prisma.dmmf.datamodel.models.find(
        (m: DMMFModel) => m.name === modelName,
      )
      expect(model, `Modelo '${modelName}' não encontrado no DMMF`).toBeDefined()

      const fieldNames = model!.fields.map((f: DMMFModel['fields'][0]) => f.name)
      expect(
        fieldNames,
        `Modelo '${modelName}' tem updatedAt — deveria ser imutável`,
      ).not.toContain('updatedAt')
    },
  )

  it('PRDDocument tem campo createdAt (timestamp de geração)', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'PRDDocument',
    )!
    const fieldNames = model.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('createdAt')
  })

  it('PRDDocument tem campo status para rastrear ciclo de vida', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'PRDDocument',
    )!
    const fieldNames = model.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('status')
  })

  it('EstimateVersion tem campo version para versionamento imutável', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'EstimateVersion',
    )!
    const fieldNames = model.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('version')
    expect(fieldNames).toContain('snapshot') // snapshot do estado no momento
  })

  it('ProfitReport tem campos de auditoria financeira imutável', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'ProfitReport',
    )!
    const fieldNames = model.fields.map((f: DMMFModel['fields'][0]) => f.name)
    // ProfitReport usa generatedAt (não createdAt) como timestamp de geração
    const hasTimestamp = fieldNames.includes('createdAt') || fieldNames.includes('generatedAt')
    expect(hasTimestamp).toBe(true)
    expect(fieldNames).toContain('revenue')
    expect(fieldNames).toContain('cost')
    expect(fieldNames).toContain('marginPct')
  })

  it('ApprovalLog (audit trail) tem campos imutáveis', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'ApprovalLog',
    )
    // ApprovalLog pode não existir se módulo de aprovação não implementado ainda
    if (!model) {
      console.log('  [SKIP] ApprovalLog não encontrado no schema')
      return
    }
    const fieldNames = model.fields.map((f: DMMFModel['fields'][0]) => f.name)
    expect(fieldNames).toContain('createdAt')
    expect(fieldNames).not.toContain('updatedAt')
  })
})
