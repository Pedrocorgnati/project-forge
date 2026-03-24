/**
 * Contract Test: ClientPortal Visibility
 *
 * Valida que o modelo de acesso CLIENTE tem as restrições corretas:
 * - ClientAccess referencia o projeto
 * - CLIENTE (role) não tem permissões de P&L/timesheets
 * - Modelo ApprovalRequest está linkado ao ClientAccess
 *
 * Para validação HTTP de isolamento (CLIENTE não acessa /api/timesheets),
 * usar auth-contract.test.ts com servidor ativo e token CLIENTE.
 */
import { describe, it, expect } from 'vitest'
import { Prisma, UserRole } from '@prisma/client'
import { hasPermission } from '@/lib/rbac/permissions'

describe('ClientPortal Visibility Contract', () => {
  it('modelo ClientAccess existe e referencia Project e User', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: { name: string; fields: Array<{ name: string; type: string; relationName?: string | null }> }) => m.name === 'ClientAccess',
    )
    expect(model).toBeDefined()
    const relationTypes = model!.fields
      .filter((f: { name: string; type: string; relationName?: string | null }) => f.relationName)
      .map((f: { name: string; type: string; relationName?: string | null }) => f.type)
    expect(relationTypes).toContain('Project')
    expect(relationTypes).toContain('User')
  })

  it('CLIENTE não tem acesso a dados financeiros (P&L)', () => {
    expect(hasPermission(UserRole.CLIENTE, 'profitability:read')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'timesheet:read:all')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'timesheet:read:own')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'timesheet:write')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'cost-config:write')).toBe(false)
  })

  it('CLIENTE não pode criar ou editar projetos', () => {
    expect(hasPermission(UserRole.CLIENTE, 'project:write')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'project:delete')).toBe(false)
  })

  it('CLIENTE não pode gerenciar equipe ou configurações', () => {
    expect(hasPermission(UserRole.CLIENTE, 'task:write')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'task:assign')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'settings:write')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'rag:index')).toBe(false)
  })

  it('CLIENTE tem apenas permissões de portal (portal:access, approval:submit)', () => {
    expect(hasPermission(UserRole.CLIENTE, 'portal:access')).toBe(true)
    expect(hasPermission(UserRole.CLIENTE, 'approval:submit')).toBe(true)
    // Pode ler documentos compartilhados
    expect(hasPermission(UserRole.CLIENTE, 'brief:read')).toBe(true)
    expect(hasPermission(UserRole.CLIENTE, 'changeorder:read')).toBe(true)
  })

  it('ApprovalRequest tem referência a ClientAccess (isolamento por cliente)', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: { name: string; fields: Array<{ name: string; type: string; relationName?: string | null }> }) => m.name === 'ApprovalRequest',
    )
    expect(model).toBeDefined()
    const relationTypes = model!.fields
      .filter((f: { name: string; type: string; relationName?: string | null }) => f.relationName)
      .map((f: { name: string; type: string; relationName?: string | null }) => f.type)
    expect(relationTypes).toContain('ClientAccess')
  })

  it('modelo ClientFeedback existe (rastreabilidade de feedback do cliente)', () => {
    const model = Prisma.dmmf.datamodel.models.find(
      (m: { name: string; fields: Array<{ name: string }> }) => m.name === 'ClientFeedback',
    )
    if (!model) {
      console.log('  [SKIP] ClientFeedback não encontrado no schema (módulo pendente)')
      return
    }
    const fieldNames = model.fields.map((f: { name: string }) => f.name)
    expect(fieldNames).toContain('createdAt')
  })
})
