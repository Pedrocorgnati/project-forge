import { UserRole } from '@prisma/client'

// ─── TIPOS DE PERMISSÃO ───────────────────────────────────────────────────────

export type Permission =
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'brief:read'
  | 'brief:write'
  | 'brief:approve'
  | 'estimate:read'
  | 'estimate:write'
  | 'estimate:approve'
  | 'task:read'
  | 'task:write'
  | 'task:assign'
  | 'changeorder:read'
  | 'changeorder:write'
  | 'changeorder:approve-high-value'
  | 'timesheet:read:own'
  | 'timesheet:read:all'
  | 'timesheet:write'
  | 'profitability:read'
  | 'cost-config:write'
  | 'rag:query'
  | 'rag:index'
  | 'portal:access'
  | 'approval:submit'
  | 'notification:preferences:write'
  | 'settings:write'

// ─── MATRIZ DE PERMISSÕES POR ROLE ────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
    'task:read',
    'task:write',
    'task:assign',
    'changeorder:read',
    'changeorder:write',
    'changeorder:approve-high-value',
    'timesheet:read:all',
    'timesheet:write',
    'profitability:read',
    'cost-config:write',
    'rag:query',
    'rag:index',
    'notification:preferences:write',
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
    'task:assign',
    'changeorder:read',
    'changeorder:write',
    'timesheet:read:all',
    'rag:query',
    'rag:index',
    'notification:preferences:write',
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
    'notification:preferences:write',
  ],
  [UserRole.CLIENTE]: [
    'portal:access',
    'approval:submit',
    'brief:read',
    'changeorder:read',
    'notification:preferences:write',
  ],
}
