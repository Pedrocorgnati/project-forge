// ─── CHANGE ORDER TYPES ────────────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-0
// Rastreabilidade: INT-072

export type ChangeOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

export interface ChangeOrderBase {
  id: string
  projectId: string
  title: string
  description: string
  /** Horas adicionais estimadas (alias de hoursImpact no DB) */
  impactHours: number
  /** Custo adicional calculado (alias de costImpact no DB) */
  impactCost: number
  /** IDs das tasks afetadas por esta CO */
  affectedTaskIds: string[]
  status: ChangeOrderStatus
  /** ID do usuário que criou/solicitou a CO */
  requestedBy: string
  requestedAt: string
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedBy?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChangeOrderWithRelations extends ChangeOrderBase {
  requester?: {
    id: string
    name: string
    role: string
  } | null
  approver?: {
    id: string
    name: string
  } | null
  rejector?: {
    id: string
    name: string
  } | null
}

export interface ProjectImpactSummary {
  totalApprovedCOs: number
  totalImpactHours: number
  totalImpactCost: number
  pendingCOs: number
  rejectedCOs: number
  approvedCOIds: string[]
}

// CO_ERRORS removido — usar ERROR_CODES de '@/lib/constants/errors' (GAP-013)
