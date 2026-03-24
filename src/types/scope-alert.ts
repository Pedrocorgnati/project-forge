// ─── SCOPE ALERT TYPES ────────────────────────────────────────────────────────
// module-10-scopeshield-validation
// Rastreabilidade: INT-066, INT-067

export type ScopeAlertType = 'SCOPE_CREEP' | 'OUT_OF_SCOPE' | 'DUPLICATE'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'DISMISSED'

export interface ScopeAlertDTO {
  id: string
  projectId: string
  taskId: string
  type: ScopeAlertType
  severity: AlertSeverity
  description: string
  aiRationale: string
  relatedTaskId?: string | null
  status: AlertStatus
  dismissedBy?: string | null
  dismissedAt?: string | null
  dismissReason?: string | null
  createdAt: string
  updatedAt: string
  task?: {
    id: string
    title: string
    status: string
  }
  dismissedByUser?: {
    id: string
    name: string
  } | null
}

export interface ScopeValidationInput {
  taskId: string
  taskTitle: string
  taskDescription?: string | null
  projectId: string
}

export interface ScopeValidationOutput {
  alerts: Array<{
    type: ScopeAlertType
    severity: AlertSeverity
    description: string
    aiRationale: string
    relatedTaskId?: string
  }>
}

export interface DismissAlertPayload {
  action: 'dismiss'
  reason: string
}

export interface AcknowledgeAlertPayload {
  action: 'acknowledge'
}

export type AlertActionPayload = DismissAlertPayload | AcknowledgeAlertPayload
