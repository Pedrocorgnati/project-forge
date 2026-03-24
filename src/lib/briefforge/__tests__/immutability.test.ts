import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocumentService, ImmutableDocumentError } from '../document-service'
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

// Transação mock usa o mesmo objeto prisma (simplificação para unit tests)
const mockTx = {
  pRDDocument: prisma.pRDDocument,
}

// ─── TESTES ───────────────────────────────────────────────────────────────────

describe('PRDDocument — Imutabilidade (application layer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DocumentService.finalizeGeneration()', () => {
    it('lança ImmutableDocumentError se documento já está READY', async () => {
      vi.mocked(prisma.pRDDocument.findUniqueOrThrow).mockResolvedValue({
        id: 'prd_001',
        briefId: 'brief_001',
        version: 1,
        content: 'conteúdo original',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      await expect(DocumentService.finalizeGeneration('prd_001', 'novo conteúdo')).rejects.toThrow(
        ImmutableDocumentError,
      )
    })

    it('lança ImmutableDocumentError com mensagem contendo o id', async () => {
      vi.mocked(prisma.pRDDocument.findUniqueOrThrow).mockResolvedValue({
        id: 'prd_abc',
        status: PRDStatus.READY,
      } as never)

      await expect(DocumentService.finalizeGeneration('prd_abc', 'conteúdo')).rejects.toThrow(
        /prd_abc/,
      )
    })

    it('permite finalizar documento GENERATING (único UPDATE válido)', async () => {
      vi.mocked(prisma.pRDDocument.findUniqueOrThrow).mockResolvedValue({
        id: 'prd_001',
        status: PRDStatus.GENERATING,
      } as never)

      vi.mocked(prisma.pRDDocument.update).mockResolvedValue({
        id: 'prd_001',
        briefId: 'brief_001',
        version: 1,
        content: 'PRD gerado',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        createdAt: new Date(),
      } as never)

      const result = await DocumentService.finalizeGeneration('prd_001', 'PRD gerado')
      expect(result.status).toBe(PRDStatus.READY)
      expect(prisma.pRDDocument.update).toHaveBeenCalledWith({
        where: { id: 'prd_001' },
        data: { status: 'READY', content: 'PRD gerado' },
      })
    })
  })

  describe('DocumentService.markError()', () => {
    it('ignora silenciosamente se documento está READY (sem lançar erro)', async () => {
      vi.mocked(prisma.pRDDocument.findUnique).mockResolvedValue({
        id: 'prd_001',
        status: PRDStatus.READY,
      } as never)

      // Não deve lançar erro — apenas logar
      await expect(DocumentService.markError('prd_001', 'algum erro')).resolves.toBeUndefined()
      expect(prisma.pRDDocument.update).not.toHaveBeenCalled()
    })

    it('marca como ERROR se documento está GENERATING', async () => {
      vi.mocked(prisma.pRDDocument.findUnique).mockResolvedValue({
        id: 'prd_001',
        status: PRDStatus.GENERATING,
      } as never)

      vi.mocked(prisma.pRDDocument.update).mockResolvedValue({} as never)

      await DocumentService.markError('prd_001', 'Claude CLI timeout')
      expect(prisma.pRDDocument.update).toHaveBeenCalledWith({
        where: { id: 'prd_001' },
        data: { status: 'ERROR', content: '[ERRO DE GERAÇÃO]: Claude CLI timeout' },
      })
    })
  })

  describe('DocumentService.createVersion()', () => {
    it('cria PRDDocument com version = 1 quando não há versões anteriores', async () => {
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

      const result = await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        content: 'PRD v1',
      })

      expect(result.version).toBe(1)
      expect(prisma.pRDDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
      )
    })

    it('incrementa version ao criar segunda versão', async () => {
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

      const result = await DocumentService.createVersion({
        briefId: 'brief_001',
        generatedBy: 'user_pm',
        status: PRDStatus.READY,
        content: 'PRD v2',
      })

      expect(result.version).toBe(2)
      expect(prisma.pRDDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ version: 2 }) }),
      )
    })

    it('usa prisma.$transaction para garantir atomicidade', async () => {
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
        status: PRDStatus.READY,
        content: '',
      })

      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })
})

describe('PRDDocument — API imutabilidade', () => {
  it('DocumentService não expõe método updateContent', () => {
    expect(DocumentService).not.toHaveProperty('updateContent')
    expect(DocumentService).not.toHaveProperty('setContent')
    expect(DocumentService).not.toHaveProperty('replaceContent')
    expect(DocumentService).not.toHaveProperty('deleteVersion')
  })
})
