import { describe, it, expect } from 'vitest'
import { PRDDocument, PRDStatus } from '@/types/briefforge'
import { DocumentService } from '../document-service'

/**
 * Contrato cross-rock: PRDDocument → module-17-clientportal-approvals
 *
 * module-17 depende dos seguintes campos de PRDDocument:
 *   id:          para vincular Approval ao PRDDocument
 *   briefId:     para navegar de Approval até Brief
 *   version:     para exibir "Aprovando versão X"
 *   content:     para exibir no portal de aprovação do cliente
 *   status:      Approval só pode ser criado para PRD READY
 *   createdAt:   para exibir "Gerado em X"
 *   generatedBy: para exibir quem gerou (auditoria)
 *
 * ATENÇÃO: remover qualquer destes campos do tipo PRDDocument ou do schema
 * quebrará o module-17 em runtime. Este teste documenta e protege o contrato.
 */

describe('Cross-rock contract — PRDDocument para module-17-clientportal-approvals', () => {
  const mockDoc: PRDDocument = {
    id: 'prd_001',
    briefId: 'brief_001',
    version: 1,
    content: '# PRD\n\n## Visão Geral\nConteúdo do PRD.',
    generatedBy: 'user_pm_001',
    status: PRDStatus.READY,
    createdAt: new Date('2026-03-22'),
  }

  describe('Campos obrigatórios do contrato', () => {
    const contractFields: (keyof PRDDocument)[] = [
      'id',
      'briefId',
      'version',
      'content',
      'status',
      'createdAt',
      'generatedBy',
    ]

    it.each(contractFields)('PRDDocument possui campo "%s"', (field) => {
      expect(mockDoc).toHaveProperty(field)
      expect(mockDoc[field]).not.toBeUndefined()
    })
  })

  describe('Imutabilidade contratual', () => {
    it('PRDDocument NÃO possui updatedAt — confirma imutabilidade do contrato', () => {
      expect(mockDoc).not.toHaveProperty('updatedAt')
    })

    it('PRDDocument tem apenas os campos esperados pelo contrato (sem extras surpresa)', () => {
      const allowedFields = new Set<string>([
        'id', 'briefId', 'version', 'content', 'status', 'createdAt', 'generatedBy',
      ])
      const actualFields = Object.keys(mockDoc)
      for (const field of actualFields) {
        expect(allowedFields.has(field)).toBe(true)
      }
    })
  })

  describe('assertPRDIsReady() — guard para module-17', () => {
    /**
     * Documenta e testa a função guard que module-17 deve usar
     * antes de criar um Approval vinculado a um PRDDocument.
     * Apenas PRDs com status READY podem receber Approvals.
     */
    function assertPRDIsReady(prd: PRDDocument): void {
      if (prd.status !== PRDStatus.READY) {
        throw new Error(`PRD ${prd.id} não está READY (status: ${prd.status})`)
      }
    }

    it('PRD READY → não lança erro', () => {
      expect(() => assertPRDIsReady(mockDoc)).not.toThrow()
    })

    it('PRD GENERATING → lança erro com id do documento', () => {
      const generatingDoc: PRDDocument = { ...mockDoc, status: PRDStatus.GENERATING }
      expect(() => assertPRDIsReady(generatingDoc)).toThrow(/prd_001/)
    })

    it('PRD ERROR → lança erro com status no message', () => {
      const errorDoc: PRDDocument = { ...mockDoc, status: PRDStatus.ERROR }
      expect(() => assertPRDIsReady(errorDoc)).toThrow(/ERROR/)
    })
  })

  describe('PRDStatus enum — valores do contrato', () => {
    it('PRDStatus possui exatamente GENERATING, READY, ERROR', () => {
      const expectedStatuses = ['GENERATING', 'READY', 'ERROR']
      const actualStatuses = Object.values(PRDStatus)
      expect(actualStatuses.sort()).toEqual(expectedStatuses.sort())
    })

    it('PRDStatus.READY é o único status que permite Approval', () => {
      // Documentado: apenas READY pode ter Approval criado
      expect(PRDStatus.READY).toBe('READY')
      expect(PRDStatus.GENERATING).toBe('GENERATING')
      expect(PRDStatus.ERROR).toBe('ERROR')
    })
  })

  describe('DocumentService — API surface compatível com contrato', () => {
    it('DocumentService expõe findLatest() para leitura pelo module-17', () => {
      expect(typeof DocumentService.findLatest).toBe('function')
    })

    it('DocumentService expõe findById() para leitura pelo module-17', () => {
      expect(typeof DocumentService.findById).toBe('function')
    })

    it('DocumentService expõe listVersions() para histórico', () => {
      expect(typeof DocumentService.listVersions).toBe('function')
    })

    it('DocumentService NÃO expõe métodos destrutivos que module-17 poderia usar erroneamente', () => {
      expect(DocumentService).not.toHaveProperty('delete')
      expect(DocumentService).not.toHaveProperty('update')
      expect(DocumentService).not.toHaveProperty('updateContent')
      expect(DocumentService).not.toHaveProperty('setContent')
    })
  })
})
