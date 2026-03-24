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

describe('DocumentService.findLatest()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna null se não há PRDs para o brief', async () => {
    vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue(null)
    const result = await DocumentService.findLatest('brief_001')
    expect(result).toBeNull()
  })

  it('retorna o documento com maior version', async () => {
    vi.mocked(prisma.pRDDocument.findFirst).mockResolvedValue({
      id: 'prd_003',
      version: 3,
      status: PRDStatus.READY,
    } as never)

    const result = await DocumentService.findLatest('brief_001')
    expect(result?.version).toBe(3)
  })
})

describe('DocumentService.listVersions()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna array vazio se não há versões', async () => {
    vi.mocked(prisma.pRDDocument.findMany).mockResolvedValue([])
    const result = await DocumentService.listVersions('brief_001')
    expect(result).toHaveLength(0)
  })

  it('não inclui campo content nos resultados', async () => {
    vi.mocked(prisma.pRDDocument.findMany).mockResolvedValue([
      { id: 'prd_001', briefId: 'brief_001', version: 1, status: 'READY', createdAt: new Date(), generatedBy: 'u' },
    ] as never)

    const result = await DocumentService.listVersions('brief_001')
    expect(result[0]).not.toHaveProperty('content')
  })

  it('solicita ordenação decrescente por version', async () => {
    vi.mocked(prisma.pRDDocument.findMany).mockResolvedValue([])

    await DocumentService.listVersions('brief_001')
    expect(prisma.pRDDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { version: 'desc' } }),
    )
  })
})

describe('DocumentService.logAccess()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chama documentAccessLog.create com os dados corretos', () => {
    vi.mocked(prisma.documentAccessLog.create).mockResolvedValue({} as never)

    DocumentService.logAccess({
      documentId: 'prd_001',
      accessedBy: 'user_001',
      action: 'VIEW',
    })

    // fire-and-forget — verificar que foi chamado (pode ser assíncrono)
    expect(prisma.documentAccessLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentId: 'prd_001',
          accessedBy: 'user_001',
          action: 'VIEW',
        }),
      }),
    )
  })

  it('não propaga erro para o chamador se logAccess falha', () => {
    vi.mocked(prisma.documentAccessLog.create).mockRejectedValue(new Error('DB down'))

    // Não deve lançar erro — é fire-and-forget
    expect(() =>
      DocumentService.logAccess({ documentId: 'prd_001', accessedBy: 'u' }),
    ).not.toThrow()
  })
})
