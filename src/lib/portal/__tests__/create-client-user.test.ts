// src/lib/portal/__tests__/create-client-user.test.ts
// module-16-clientportal-auth / TASK-6 ST002
// Testes unitários para createClientUser (caminho atômico crítico)
// Rastreabilidade: GAP-014

import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreateUser = vi.fn()
const mockDeleteUser = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    code: string
    statusCode: number
    constructor(code: string, message: string, statusCode: number) {
      super(message)
      this.code = code
      this.statusCode = statusCode
    }
  },
}))

import { prisma } from '@/lib/db'
import { createClientUser } from '../create-client-user'

const mockPrismaCreate = vi.mocked(prisma.user.create)

const validParams = {
  email: 'client@test.com',
  password: 'securePass123',
  name: 'Client User',
  organizationId: 'org-1',
}

describe('createClientUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateUser.mockResolvedValue({
      data: { user: { id: 'supabase-uid-1' } },
      error: null,
    })
    mockPrismaCreate.mockResolvedValue({
      id: 'supabase-uid-1',
      email: 'client@test.com',
      name: 'Client User',
      role: 'CLIENTE',
      organizationId: 'org-1',
    } as never)
    mockDeleteUser.mockResolvedValue({ data: null, error: null })
  })

  it('dados válidos → User Prisma criado com role CLIENTE e supabaseId vinculado', async () => {
    const user = await createClientUser(validParams)

    expect(user.id).toBe('supabase-uid-1')
    expect(user.role).toBe('CLIENTE')
    expect(user.email).toBe('client@test.com')
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'client@test.com',
        password: 'securePass123',
        email_confirm: true,
      }),
    )
    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'supabase-uid-1',
        role: 'CLIENTE',
        organizationId: 'org-1',
      }),
    })
  })

  it('Supabase Auth falha → erro lançado, nenhum User Prisma criado', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Service unavailable' },
    })

    await expect(createClientUser(validParams)).rejects.toThrow('Serviço de autenticação indisponível')
    expect(mockPrismaCreate).not.toHaveBeenCalled()
  })

  it('Prisma falha após Supabase criar conta → rollback: Supabase Auth user deletado', async () => {
    mockPrismaCreate.mockRejectedValue(new Error('Unique constraint violation'))

    await expect(createClientUser(validParams)).rejects.toThrow('Falha ao persistir usuário no banco')
    expect(mockDeleteUser).toHaveBeenCalledWith('supabase-uid-1')
  })

  it('email duplicado no Supabase Auth → erro tratado', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    await expect(createClientUser(validParams)).rejects.toThrow('Serviço de autenticação indisponível')
    expect(mockPrismaCreate).not.toHaveBeenCalled()
  })
})
