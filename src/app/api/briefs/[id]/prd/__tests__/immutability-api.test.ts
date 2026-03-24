import { describe, it, expect } from 'vitest'
import { DocumentService } from '@/lib/briefforge/document-service'

/**
 * Testes de imutabilidade via API.
 * Verificam que o contrato "PRDDocument é imutável após READY" é respeitado:
 * - Nenhum handler de escrita além de POST existe no route
 * - DocumentService não expõe métodos de alteração de content
 *
 * Nota: PATCH/PUT/DELETE → Next.js App Router retorna 405 automaticamente quando
 * o handler não está exportado. Verificamos o contrato via análise de exports.
 */

describe('PRDDocument — Imutabilidade via API', () => {
  describe('Route exports — apenas POST e GET permitidos', () => {
    it('route de PRD não exporta PATCH', async () => {
      const prdRoute = await import('../route')
      expect(prdRoute).not.toHaveProperty('PATCH')
    })

    it('route de PRD não exporta PUT', async () => {
      const prdRoute = await import('../route')
      expect(prdRoute).not.toHaveProperty('PUT')
    })

    it('route de PRD não exporta DELETE', async () => {
      const prdRoute = await import('../route')
      expect(prdRoute).not.toHaveProperty('DELETE')
    })

    it('route de PRD exporta POST e GET', async () => {
      const prdRoute = await import('../route')
      expect(typeof prdRoute.POST).toBe('function')
      expect(typeof prdRoute.GET).toBe('function')
    })
  })

  describe('DocumentService — API pública imutável', () => {
    it('não expõe método updateContent', () => {
      expect(DocumentService).not.toHaveProperty('updateContent')
    })

    it('não expõe método setContent', () => {
      expect(DocumentService).not.toHaveProperty('setContent')
    })

    it('não expõe método replaceContent', () => {
      expect(DocumentService).not.toHaveProperty('replaceContent')
    })

    it('não expõe método deleteVersion', () => {
      expect(DocumentService).not.toHaveProperty('deleteVersion')
    })

    it('não expõe método deleteDocument', () => {
      expect(DocumentService).not.toHaveProperty('deleteDocument')
    })

    it('não expõe método updateDocument', () => {
      expect(DocumentService).not.toHaveProperty('updateDocument')
    })
  })

  describe('Versionamento preserva histórico', () => {
    it('createVersion cria novo registro sem sobrescrever versões anteriores', async () => {
      // Verifica que createVersion usa prisma.create (não update)
      // Garante semântica append-only
      const source = DocumentService.createVersion.toString()
      expect(source).toContain('create')
      expect(source).not.toMatch(/\.update\(/)
    })
  })
})
