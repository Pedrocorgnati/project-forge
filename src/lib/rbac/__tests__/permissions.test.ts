import { describe, it, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import { hasPermission, getPermissions, hasAllPermissions, hasAnyPermission } from '../permissions'
import { ROLE_PERMISSIONS } from '../constants'

describe('RBAC Matrix', () => {
  describe('SOCIO', () => {
    it('pode acessar profitability', () => {
      expect(hasPermission(UserRole.SOCIO, 'profitability:read')).toBe(true)
    })

    it('pode deletar projetos', () => {
      expect(hasPermission(UserRole.SOCIO, 'project:delete')).toBe(true)
    })

    it('pode aprovar change orders de alto valor', () => {
      expect(hasPermission(UserRole.SOCIO, 'changeorder:approve-high-value')).toBe(true)
    })

    it('pode configurar custo', () => {
      expect(hasPermission(UserRole.SOCIO, 'cost-config:write')).toBe(true)
    })

    it('pode aprovar estimativas', () => {
      expect(hasPermission(UserRole.SOCIO, 'estimate:approve')).toBe(true)
    })
  })

  describe('PM', () => {
    it('pode ler e escrever projetos', () => {
      expect(hasPermission(UserRole.PM, 'project:read')).toBe(true)
      expect(hasPermission(UserRole.PM, 'project:write')).toBe(true)
    })

    it('não pode deletar projetos', () => {
      expect(hasPermission(UserRole.PM, 'project:delete')).toBe(false)
    })

    it('não acessa profitability', () => {
      expect(hasPermission(UserRole.PM, 'profitability:read')).toBe(false)
    })

    it('não pode configurar custo', () => {
      expect(hasPermission(UserRole.PM, 'cost-config:write')).toBe(false)
    })

    it('não pode aprovar change orders de alto valor', () => {
      expect(hasPermission(UserRole.PM, 'changeorder:approve-high-value')).toBe(false)
    })

    it('pode ver todos os timesheets', () => {
      expect(hasPermission(UserRole.PM, 'timesheet:read:all')).toBe(true)
    })
  })

  describe('DEV', () => {
    it('não acessa custo/margem', () => {
      expect(hasPermission(UserRole.DEV, 'profitability:read')).toBe(false)
    })

    it('não aprova estimativas', () => {
      expect(hasPermission(UserRole.DEV, 'estimate:approve')).toBe(false)
    })

    it('registra timesheet próprio', () => {
      expect(hasPermission(UserRole.DEV, 'timesheet:write')).toBe(true)
    })

    it('não lê todos os timesheets', () => {
      expect(hasPermission(UserRole.DEV, 'timesheet:read:all')).toBe(false)
    })

    it('não pode atribuir tarefas', () => {
      expect(hasPermission(UserRole.DEV, 'task:assign')).toBe(false)
    })

    it('pode consultar RAG', () => {
      expect(hasPermission(UserRole.DEV, 'rag:query')).toBe(true)
    })
  })

  describe('CLIENTE', () => {
    it('não acessa financeiro', () => {
      expect(hasPermission(UserRole.CLIENTE, 'profitability:read')).toBe(false)
    })

    it('não escreve tarefas', () => {
      expect(hasPermission(UserRole.CLIENTE, 'task:write')).toBe(false)
    })

    it('acessa portal', () => {
      expect(hasPermission(UserRole.CLIENTE, 'portal:access')).toBe(true)
    })

    it('não pode escrever estimativas', () => {
      expect(hasPermission(UserRole.CLIENTE, 'estimate:write')).toBe(false)
    })

    it('não pode atribuir tarefas', () => {
      expect(hasPermission(UserRole.CLIENTE, 'task:assign')).toBe(false)
    })

    it('não acessa configurações', () => {
      expect(hasPermission(UserRole.CLIENTE, 'settings:write')).toBe(false)
    })
  })

  describe('getPermissions', () => {
    it('retorna todas as permissões de SOCIO', () => {
      const perms = getPermissions(UserRole.SOCIO)
      expect(perms).toEqual(ROLE_PERMISSIONS[UserRole.SOCIO])
      expect(perms.length).toBeGreaterThanOrEqual(20)
    })

    it('retorna permissões vazias para role inválido', () => {
      expect(getPermissions('INVALID')).toEqual([])
    })
  })

  describe('hasAllPermissions', () => {
    it('SOCIO tem todas as permissões financeiras', () => {
      expect(
        hasAllPermissions(UserRole.SOCIO, ['profitability:read', 'cost-config:write']),
      ).toBe(true)
    })

    it('PM não tem todas as permissões financeiras', () => {
      expect(
        hasAllPermissions(UserRole.PM, ['profitability:read', 'cost-config:write']),
      ).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('CLIENTE tem pelo menos acesso ao portal', () => {
      expect(
        hasAnyPermission(UserRole.CLIENTE, ['portal:access', 'profitability:read']),
      ).toBe(true)
    })

    it('CLIENTE não tem nenhuma permissão financeira', () => {
      expect(
        hasAnyPermission(UserRole.CLIENTE, ['profitability:read', 'cost-config:write', 'estimate:write']),
      ).toBe(false)
    })
  })
})
