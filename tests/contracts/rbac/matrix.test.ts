/**
 * Contract Test: RBAC Matrix
 *
 * Valida a matriz de permissões: cada role tem as permissões corretas
 * e não tem permissões que não deveria ter.
 *
 * Não requer banco nem servidor — testa a ROLE_PERMISSIONS constante diretamente.
 * Para validação HTTP (status 401/403), usar auth-contract.test.ts com servidor ativo.
 */
import { describe, it, expect } from 'vitest'
import { UserRole } from '@prisma/client'
import { ROLE_PERMISSIONS, type Permission } from '@/lib/rbac/constants'
import {
  hasPermission,
  getPermissions,
  hasAllPermissions,
} from '@/lib/rbac/permissions'

// ── Contrato de permissões por role ──────────────────────────────────────────

/** Permissões que DEVEM existir para cada role */
const REQUIRED_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SOCIO]: [
    'project:read',
    'project:write',
    'project:delete',
    'brief:read',
    'brief:write',
    'brief:approve',
    'estimate:read',
    'estimate:write',
    'estimate:approve',
    'profitability:read',
    'cost-config:write',
    'rag:query',
    'settings:write',
  ],
  [UserRole.PM]: [
    'project:read',
    'project:write',
    'brief:read',
    'brief:write',
    'estimate:read',
    'estimate:write',
    'task:read',
    'task:write',
    'changeorder:read',
    'changeorder:write',
    'rag:query',
  ],
  [UserRole.DEV]: [
    'project:read',
    'brief:read',
    'estimate:read',
    'task:read',
    'task:write',
    'timesheet:read:own',
    'timesheet:write',
    'rag:query',
  ],
  [UserRole.CLIENTE]: [
    'portal:access',
    'approval:submit',
    'brief:read',
    'changeorder:read',
  ],
}

/** Permissões que NÃO DEVEM existir para cada role (falsa permissão = falha de segurança) */
const FORBIDDEN_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SOCIO]: [], // SOCIO tem quase tudo — sem restrições críticas
  [UserRole.PM]: [
    'project:delete',
    'cost-config:write',
    'profitability:read', // PM não vê P&L completo (apenas do próprio projeto, mas não a permissão global)
    'settings:write',
    'portal:access',
    'approval:submit',
  ],
  [UserRole.DEV]: [
    'project:write',
    'project:delete',
    'brief:write',
    'brief:approve',
    'estimate:write',
    'estimate:approve',
    'changeorder:write',
    'changeorder:approve-high-value',
    'timesheet:read:all',
    'profitability:read',
    'cost-config:write',
    'rag:index',
    'portal:access',
    'approval:submit',
    'settings:write',
  ],
  [UserRole.CLIENTE]: [
    'project:write',
    'project:delete',
    'brief:write',
    'brief:approve',
    'estimate:write',
    'estimate:approve',
    'task:write',
    'task:assign',
    'changeorder:write',
    'changeorder:approve-high-value',
    'timesheet:read:own',
    'timesheet:read:all',
    'timesheet:write',
    'profitability:read',
    'cost-config:write',
    'rag:query',
    'rag:index',
    'settings:write',
  ],
}

describe('RBAC Matrix Contract', () => {
  const roles = Object.values(UserRole)

  it('ROLE_PERMISSIONS tem entradas para todos os roles', () => {
    for (const role of roles) {
      expect(
        ROLE_PERMISSIONS[role],
        `Role '${role}' não tem permissões definidas`,
      ).toBeDefined()
      expect(
        ROLE_PERMISSIONS[role].length,
        `Role '${role}' tem permissões vazias`,
      ).toBeGreaterThan(0)
    }
  })

  it('hasPermission() e ROLE_PERMISSIONS são consistentes', () => {
    for (const role of roles) {
      const permissions = getPermissions(role)
      for (const perm of permissions) {
        expect(
          hasPermission(role, perm),
          `hasPermission(${role}, ${perm}) inconsistente com ROLE_PERMISSIONS`,
        ).toBe(true)
      }
    }
  })

  describe.each(roles)('Role: %s', (role) => {
    it(`${role} tem todas as permissões obrigatórias`, () => {
      const required = REQUIRED_PERMISSIONS[role] ?? []
      const missing: string[] = []

      for (const perm of required) {
        if (!hasPermission(role, perm)) {
          missing.push(perm)
        }
      }

      if (missing.length > 0) {
        console.log(`\n  ${role} — permissões faltando:`)
        missing.forEach((p) => console.log(`    - ${p}`))
      }

      expect(missing).toHaveLength(0)
    })

    it(`${role} NÃO tem permissões proibidas (falsa autorização)`, () => {
      const forbidden = FORBIDDEN_PERMISSIONS[role] ?? []
      const violations: string[] = []

      for (const perm of forbidden) {
        if (hasPermission(role, perm)) {
          violations.push(perm)
        }
      }

      if (violations.length > 0) {
        console.log(`\n  ${role} — permissões proibidas presentes (VIOLAÇÃO DE SEGURANÇA):`)
        violations.forEach((p) => console.log(`    - ${p}`))
      }

      expect(violations).toHaveLength(0)
    })
  })

  it('CLIENTE nunca tem permissão de ver P&L (isolamento financeiro)', () => {
    expect(hasPermission(UserRole.CLIENTE, 'profitability:read')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'timesheet:read:all')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'timesheet:read:own')).toBe(false)
  })

  it('CLIENTE tem apenas portal:access e approval:submit como ações', () => {
    expect(hasPermission(UserRole.CLIENTE, 'portal:access')).toBe(true)
    expect(hasPermission(UserRole.CLIENTE, 'approval:submit')).toBe(true)
    expect(hasPermission(UserRole.CLIENTE, 'project:write')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'estimate:approve')).toBe(false)
  })

  it('apenas SOCIO pode deletar projetos', () => {
    expect(hasPermission(UserRole.SOCIO, 'project:delete')).toBe(true)
    expect(hasPermission(UserRole.PM, 'project:delete')).toBe(false)
    expect(hasPermission(UserRole.DEV, 'project:delete')).toBe(false)
    expect(hasPermission(UserRole.CLIENTE, 'project:delete')).toBe(false)
  })

  it('apenas SOCIO e PM podem gerenciar change orders de alto valor', () => {
    // changeorder:approve-high-value
    const canApproveHighValue: UserRole[] = [UserRole.SOCIO]
    for (const role of roles) {
      const should = canApproveHighValue.includes(role)
      const has = hasPermission(role, 'changeorder:approve-high-value')
      expect(
        has,
        `${role}: changeorder:approve-high-value deveria ser ${should ? 'true' : 'false'}`,
      ).toBe(should)
    }
  })

  it('hasAllPermissions() funciona corretamente para combinações', () => {
    // SOCIO tem tudo
    expect(
      hasAllPermissions(UserRole.SOCIO, [
        'project:read',
        'estimate:approve',
        'profitability:read',
      ]),
    ).toBe(true)

    // DEV não tem write
    expect(
      hasAllPermissions(UserRole.DEV, ['project:read', 'project:write']),
    ).toBe(false)
  })
})
