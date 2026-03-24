// src/types/board.ts
// Tipos base do módulo ScopeShield Board (module-9)
// Rastreabilidade INTAKE: INT-060

// ─── Enums de domínio (espelho dos enums Prisma, usados no client-side) ────────

export enum TaskStatus {
  TODO        = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW      = 'REVIEW',
  DONE        = 'DONE',
}

export enum TaskPriority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
}

// ─── Assignee resumido (subset de User para exibição no card) ─────────────────

export interface TaskAssignee {
  id:        string
  name:      string | null
  avatarUrl: string | null
}

// ─── Entidade Task enriquecida com dados do assignee ──────────────────────────

export interface TaskWithAssignee {
  id:             string
  projectId:      string
  title:          string
  description:    string | null
  status:         TaskStatus
  assigneeId:     string | null
  assignee:       TaskAssignee | null
  estimatedHours: number | null
  actualHours:    number
  priority:       TaskPriority
  labels:         string[]
  dueDate:        Date | null
  position:       number
  createdBy:      string
  createdAt:      Date
  updatedAt:      Date
}

// ─── Coluna do Kanban ──────────────────────────────────────────────────────────

export interface BoardColumn {
  id:    TaskStatus
  title: string
  tasks: TaskWithAssignee[]
  color: string   // classe Tailwind para o header da coluna
}

// ─── Dados do overlay de drag (o "fantasma" que segue o cursor) ───────────────

export interface DragOverlayData {
  type:    'TASK' | 'COLUMN'
  task?:   TaskWithAssignee
  column?: BoardColumn
}

// ─── Configuração global do Kanban ────────────────────────────────────────────

export interface KanbanConfig {
  projectId:       string
  canEdit:         boolean   // false para CLIENTE (read-only)
  canCreateTask:   boolean   // SOCIO, PM only
  canSnapshot:     boolean   // PM only
  realtimeEnabled: boolean
}

// ─── Transições de status permitidas (validação client-side) ─────────────────

export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]:        [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.TODO],
  [TaskStatus.REVIEW]:      [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
  [TaskStatus.DONE]:        [TaskStatus.REVIEW],
}

// ─── Labels das colunas ───────────────────────────────────────────────────────

export const COLUMN_CONFIG: Record<TaskStatus, { title: string; color: string }> = {
  [TaskStatus.TODO]:        { title: 'A Fazer',       color: 'bg-slate-100' },
  [TaskStatus.IN_PROGRESS]: { title: 'Em Progresso',  color: 'bg-blue-50'  },
  [TaskStatus.REVIEW]:      { title: 'Em Revisão',    color: 'bg-amber-50' },
  [TaskStatus.DONE]:        { title: 'Concluído',     color: 'bg-green-50' },
}

// ─── Snapshot de Scope Baseline ───────────────────────────────────────────────

export interface ScopeBaselineSummary {
  id:          string
  projectId:   string
  name:        string
  description: string | null
  taskCount:   number
  createdBy:   string
  createdAt:   Date
}

export interface ScopeBaselineDetail extends ScopeBaselineSummary {
  snapshot: TaskWithAssignee[]
}
