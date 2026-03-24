import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentService } from '../document-service'
import { PRDStatus } from '@/types/briefforge'

// ─── MOCKS ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    pRDDocument: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    documentAccessLog: {
      create: vi.fn(),
    },
  },
}))

const { prisma } = await import('@/lib/db')
const mockTx = { pRDDocument: prisma.pRDDocument }

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('PRDDocument — Versionamento', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('DocumentService.createVersion() — incremento atômico', () => {
    it('primeira geração → version === 1', async () => {
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.pRDDocument.create).mockResolvedValue({
        id: 'prd_001',
        briefId: 'brief_001',
        version: 1,
        content: 'PRD v1',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      const doc = await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'user_pm',
        content: 'PRD v1',
        status: PRDStatus.READY,
      })

      expect(doc.version).toBe(1)
      expect(prisma.pRDDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
      )
    })

    it('segunda geração → version === 2 (incremento correto)', async () => {
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue({ version: 1 } as never)
      vi.mocked(prisma.pRDDocument.create).mockResolvedValue({
        id: 'prd_002',
        briefId: 'brief_001',
        version: 2,
        content: 'PRD v2',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      const doc = await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'user_pm',
        content: 'PRD v2',
        status: PRDStatus.READY,
      })

      expect(doc.version).toBe(2)
      expect(prisma.pRDDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 2 }) }),
      )
    })

    it('terceira geração → version === 3', async () => {
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue({ version: 2 } as never)
      vi.mocked(prisma.pRDDocument.create).mockResolvedValue({
        id: 'prd_003',
        briefId: 'brief_001',
        version: 3,
        content: 'PRD v3',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      const doc = await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'user_pm',
        content: 'PRD v3',
        status: PRDStatus.READY,
      })

      expect(doc.version).toBe(3)
    })

    it('usa prisma.$transaction para garantir atomicidade do incremento', async () => {
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.pRDDocument.create).mockResolvedValue({
        id: 'prd_001',
        version: 1,
        status: PRDStatus.READY,
        briefId: 'brief_001',
        content: '',
        generatedBy: 'u',
        createdAt: new Date(),
      } as never)

      await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'u',
        content: '',
        status: PRDStatus.READY,
      })

      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('busca a version mais recente em ordem decrescente antes de incrementar', async () => {
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.pRDDocument.create).mockResolvedValue({
        id: 'prd_001',
        version: 1,
        status: PRDStatus.READY,
        briefId: 'brief_001',
        content: '',
        generatedBy: 'u',
        createdAt: new Date(),
      } as never)

      await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'u',
        content: '',
        status: PRDStatus.READY,
      })

      expect(prisma.pRDDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { version: 'desc' } }),
      )
    })

    it('versões de briefs diferentes são independentes — version 1 para cada brief', async () => {
      // Simula que o brief B não tem versões ainda (findFirst retorna null)
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.pRDDocument.create).mockResolvedValue({
        id: 'prd_briefB_001',
        briefId: 'brief_002',
        version: 1,
        content: 'PRD do brief B',
        generatedBy: 'u',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      const doc = await DocumentService.createVersion({
        briefId: 'brief_002',
        generatedBy: 'u',
        content: 'PRD do brief B',
        status: PRDStatus.READY,
      })

      expect(doc.version).toBe(1)
      // Cada brief começa em 1, independentemente de outros briefs
      expect(prisma.pRDDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { briefId: 'brief_002' } }),
      )
    })
  })

  describe('DocumentService.findLatest() — versão mais recente', () => {
    it('retorna versão com maior number quando há múltiplas versões', async () => {
      vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue({
        id: 'prd_003',
        briefId: 'brief_001',
        version: 3,
        content: 'PRD v3',
        generatedBy: 'u',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      const doc = await DocumentService.findLatest('brief_001')

      expect(doc?.version).toBe(3)
      expect(prisma.pRDDocument.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { version: 'desc' } }),
      )
    })
  })

  describe('DocumentService.listVersions() — histórico completo', () => {
    it('retorna array em ordem decrescente', async () => {
      vi.mocked(prisma.pRDDocument.findMany).mockResolvedValue([
        { id: 'prd_003', briefId: 'brief_001', version: 3, status: 'READY', createdAt: new Date(), generatedBy: 'u' },
        { id: 'prd_002', briefId: 'brief_001', version: 2, status: 'READY', createdAt: new Date(), generatedBy: 'u' },
        { id: 'prd_001', briefId: 'brief_001', version: 1, status: 'READY', createdAt: new Date(), generatedBy: 'u' },
      ] as never)

      const versions = await DocumentService.listVersions('brief_001')

      expect(versions[0].version).toBe(3)
      expect(versions[1].version).toBe(2)
      expect(versions[2].version).toBe(1)
      expect(prisma.pRDDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { version: 'desc' } }),
      )
    })

    it('não inclui campo content — apenas metadados', async () => {
      vi.mocked(prisma.pRDDocument.findMany).mockResolvedValue([
        { id: 'prd_001', briefId: 'brief_001', version: 1, status: 'READY', createdAt: new Date(), generatedBy: 'u' },
      ] as never)

      const versions = await DocumentService.listVersions('brief_001')

      expect(versions[0]).not.toHaveProperty('content')
    })

    it('retorna array vazio quando não há versões', async () => {
      vi.mocked(prisma.pRDDocument.findMany).mockResolvedValue([])

      const versions = await DocumentService.listVersions('brief_001')

      expect(versions).toHaveLength(0)
    })
  })
})
