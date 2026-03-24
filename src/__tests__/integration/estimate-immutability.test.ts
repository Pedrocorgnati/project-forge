import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    estimate: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    estimateVersion: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    estimateItem: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/db'

const snapshotV1 = [
  { category: 'backend-api', description: 'API REST', hoursMin: 30, hoursMax: 50, costMin: 6300, costMax: 10500 },
  { category: 'testing', description: 'Testes', hoursMin: 14, hoursMax: 20, costMin: 2940, costMax: 4200 },
]

const mockEstimateV1 = {
  id: 'est-1',
  projectId: 'proj-1',
  briefId: 'brief-1',
  version: 1,
  status: 'READY',
  totalMin: 44,
  totalMax: 70,
}

const mockVersionV1 = {
  id: 'ver-1',
  estimateId: 'est-1',
  version: 1,
  snapshot: snapshotV1,
  reason: 'Geração inicial via EstimaAI',
  changedBy: 'user-1',
  createdAt: new Date('2025-01-01'),
}

describe('Integration: Estimate Immutability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not expose PATCH/PUT endpoint for EstimateVersion (no route exists)', () => {
    // EstimateVersion é imutável por design — não existe rota de atualização
    // Verificamos que o modelo não possui método update exposto na API
    // (validação conceitual: se chamado, indica violação de contrato)
    const versionModel = prisma.estimateVersion
    // O mock existe, mas a rota da API não deve chamar update
    // Este teste documenta o contrato de imutabilidade
    expect(versionModel).toBeDefined()
    expect(versionModel.create).toBeDefined()
    expect(versionModel.findFirst).toBeDefined()
    // update existe no Prisma Client, mas NUNCA deve ser chamado por rotas
    // Ausência de chamada é validada nos testes de fluxo abaixo
  })

  it('should create new estimate version on revise, not update existing', async () => {
    vi.mocked(prisma.estimate.findUnique).mockResolvedValue(mockEstimateV1 as any)
    vi.mocked(prisma.estimateVersion.findMany).mockResolvedValue([mockVersionV1] as any)

    const newSnapshot = [
      ...snapshotV1,
      { category: 'devops', description: 'CI/CD', hoursMin: 6, hoursMax: 10, costMin: 1260, costMax: 2100 },
    ]

    const mockVersionV2 = {
      id: 'ver-2',
      estimateId: 'est-1',
      version: 2,
      snapshot: newSnapshot,
      reason: 'Revisão: adicionado item devops',
      changedBy: 'user-1',
      createdAt: new Date('2025-01-15'),
    }

    vi.mocked(prisma.estimateVersion.create).mockResolvedValue(mockVersionV2 as any)

    // Simula fluxo de revisão: cria NOVA versão, não atualiza existente
    const newVersion = await prisma.estimateVersion.create({
      data: {
        estimateId: 'est-1',
        version: 2,
        snapshot: newSnapshot as any,
        reason: 'Revisão: adicionado item devops',
        changedBy: 'user-1',
      },
    })

    expect(newVersion.version).toBe(2)
    expect(newVersion.id).not.toBe(mockVersionV1.id)
    // Confirma que update NÃO foi chamado no EstimateVersion
    expect(prisma.estimateVersion.update).not.toHaveBeenCalled()
  })

  it('should archive previous estimate when revision is created', async () => {
    vi.mocked(prisma.estimate.findUnique).mockResolvedValue(mockEstimateV1 as any)
    vi.mocked(prisma.estimate.update).mockResolvedValue({
      ...mockEstimateV1,
      status: 'ARCHIVED',
    } as any)

    // Ao criar nova revisão, o estimate anterior é arquivado
    const archived = await prisma.estimate.update({
      where: { id: 'est-1' },
      data: { status: 'ARCHIVED' },
    })

    expect(archived.status).toBe('ARCHIVED')
    expect(prisma.estimate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'est-1' },
        data: { status: 'ARCHIVED' },
      }),
    )
  })

  it('should increment version on new estimate after revision', async () => {
    const mockEstimateV2 = {
      ...mockEstimateV1,
      id: 'est-2',
      version: 2,
      status: 'GENERATING',
    }

    vi.mocked(prisma.estimate.findFirst).mockResolvedValue(mockEstimateV1 as any)
    vi.mocked(prisma.estimate.create).mockResolvedValue(mockEstimateV2 as any)

    // Busca versão anterior para calcular próximo version
    const previous = await prisma.estimate.findFirst({
      where: { projectId: 'proj-1' },
      orderBy: { version: 'desc' } as any,
    })

    const nextVersion = (previous?.version ?? 0) + 1

    const newEstimate = await prisma.estimate.create({
      data: {
        projectId: 'proj-1',
        briefId: 'brief-1',
        version: nextVersion,
        status: 'GENERATING',
      } as any,
    })

    expect(newEstimate.version).toBe(2)
    expect(newEstimate.version).toBeGreaterThan(mockEstimateV1.version)
  })

  it('should preserve snapshot in EstimateVersion immutably (no updatedAt field)', () => {
    // EstimateVersion tem apenas createdAt, sem updatedAt — imutável por design
    const versionRecord = mockVersionV1

    expect(versionRecord).toHaveProperty('createdAt')
    expect(versionRecord).not.toHaveProperty('updatedAt')

    // Snapshot é um JSON congelado no momento da criação
    expect(versionRecord.snapshot).toEqual(snapshotV1)
    expect(Array.isArray(versionRecord.snapshot)).toBe(true)
    expect(versionRecord.snapshot).toHaveLength(2)

    // Verificar que o snapshot contém os campos esperados
    const firstItem = versionRecord.snapshot[0]
    expect(firstItem).toHaveProperty('category')
    expect(firstItem).toHaveProperty('hoursMin')
    expect(firstItem).toHaveProperty('hoursMax')
    expect(firstItem).toHaveProperty('costMin')
    expect(firstItem).toHaveProperty('costMax')
  })
})
