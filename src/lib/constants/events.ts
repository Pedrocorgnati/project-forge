// ─── EVENT TYPES ──────────────────────────────────────────────────────────────

export const EventType = {
  // BriefForge (7 eventos)
  BRIEF_SESSION_STARTED:    'BRIEF_SESSION_STARTED',
  BRIEF_SESSION_PAUSED:     'BRIEF_SESSION_PAUSED',
  BRIEF_SESSION_COMPLETED:  'BRIEF_SESSION_COMPLETED',
  BRIEF_PRD_GENERATED:      'BRIEF_PRD_GENERATED',
  BRIEF_PRD_APPROVED:       'BRIEF_PRD_APPROVED',
  BRIEF_PRD_REJECTED:       'BRIEF_PRD_REJECTED',
  BRIEF_CREATED:            'BRIEF_CREATED',
  // EstimaAI (3 eventos)
  ESTIMATE_CREATED:         'ESTIMATE_CREATED',
  ESTIMATE_APPROVED:        'ESTIMATE_APPROVED',
  ESTIMATE_REVISED:         'ESTIMATE_REVISED',
  // ScopeShield Board — Tasks (3 eventos)
  TASK_CREATED:             'TASK_CREATED',
  TASK_UPDATED:             'TASK_UPDATED',
  TASK_STATUS_CHANGED:      'TASK_STATUS_CHANGED',
  // ScopeShield Validation — Alertas (2 eventos)
  SCOPE_ALERT_TRIGGERED:    'SCOPE_ALERT_TRIGGERED',
  SCOPE_ALERT_CREATED:      'SCOPE_ALERT_CREATED',
  // ScopeShield / Change Orders (5 eventos)
  CHANGE_ORDER_CREATED:     'CHANGE_ORDER_CREATED',
  CHANGE_ORDER_SUBMITTED:   'CHANGE_ORDER_SUBMITTED',
  CHANGE_ORDER_APPROVED:    'CHANGE_ORDER_APPROVED',
  CHANGE_ORDER_REJECTED:    'CHANGE_ORDER_REJECTED',
  // HandoffAI (2 eventos)
  RAG_INDEX_STARTED:        'RAG_INDEX_STARTED',
  RAG_INDEX_COMPLETED:      'RAG_INDEX_COMPLETED',
  // RentabilIA (2 eventos)
  COST_CONFIG_UPDATED:      'COST_CONFIG_UPDATED',
  PROFIT_REPORT_GENERATED:  'PROFIT_REPORT_GENERATED',
  // ClientPortal (7 eventos)
  CLIENT_ACCESS_GRANTED:    'CLIENT_ACCESS_GRANTED',
  CLIENT_INVITED:           'CLIENT_INVITED',
  CLIENT_ACCEPTED:          'CLIENT_ACCEPTED',
  EMAIL_FAILED:             'EMAIL_FAILED',
  APPROVAL_REQUESTED:       'APPROVAL_REQUESTED',
  APPROVAL_SUBMITTED:       'APPROVAL_SUBMITTED',
  APPROVAL_EXPIRED:         'APPROVAL_EXPIRED',
  // Sistema (2 eventos)
  PROJECT_CREATED:          'PROJECT_CREATED',
  PROJECT_STATUS_CHANGED:   'PROJECT_STATUS_CHANGED',
} as const

export type EventType = (typeof EventType)[keyof typeof EventType]

// ─── PAYLOADS POR EVENTO ──────────────────────────────────────────────────────

export interface EventPayloadMap {
  [EventType.BRIEF_SESSION_STARTED]:    { sessionId: string; projectId: string; userId: string }
  [EventType.BRIEF_SESSION_PAUSED]:     { sessionId: string; projectId: string }
  [EventType.BRIEF_SESSION_COMPLETED]:  { sessionId: string; projectId: string; prdUrl?: string }
  [EventType.BRIEF_PRD_GENERATED]:      { projectId: string; prdVersion: number; briefId: string; prdDocumentId: string; generatedBy: string }
  [EventType.BRIEF_PRD_APPROVED]:       { projectId: string; approvedBy: string; prdVersion: number }
  [EventType.BRIEF_PRD_REJECTED]:       { projectId: string; rejectedBy: string; reason: string }
  [EventType.BRIEF_CREATED]:            { projectId: string; briefId: string }
  [EventType.ESTIMATE_CREATED]:         { projectId: string; estimateId: string; totalHours: number }
  [EventType.ESTIMATE_APPROVED]:        { projectId: string; estimateId: string; approvedBy: string }
  [EventType.ESTIMATE_REVISED]:         { projectId: string; previousEstimateId: string; newEstimateId: string; reason: string }
  [EventType.TASK_CREATED]:             { taskId: string; createdBy: string }
  [EventType.TASK_UPDATED]:             { taskId: string; updatedBy: string; changes: Record<string, unknown> }
  [EventType.TASK_STATUS_CHANGED]:      { taskId: string; from: string; to: string; changedBy: string }
  [EventType.SCOPE_ALERT_TRIGGERED]:    { projectId: string; deviation: number; taskId: string }
  [EventType.SCOPE_ALERT_CREATED]:      { projectId: string; alertId: string; taskId: string; type: string; severity: string }
  [EventType.CHANGE_ORDER_CREATED]:     { projectId: string; changeOrderId: string; impactBRL: number }
  [EventType.CHANGE_ORDER_SUBMITTED]:   { projectId: string; changeOrderId: string; title: string; impactHours: number; requestedBy: string }
  [EventType.CHANGE_ORDER_APPROVED]:    { projectId: string; changeOrderId: string; approvedBy: string; impactHours: number; impactCost: number; requestedBy: string }
  [EventType.CHANGE_ORDER_REJECTED]:    { projectId: string; changeOrderId: string; rejectedBy: string; reason: string; requestedBy: string }
  [EventType.RAG_INDEX_STARTED]:        { projectId: string; repoUrl: string }
  [EventType.RAG_INDEX_COMPLETED]:      { projectId: string; chunkCount: number; indexDurationMs: number }
  [EventType.COST_CONFIG_UPDATED]:      { updatedBy: string; role: string; newRate: number; changes?: string[] }
  [EventType.PROFIT_REPORT_GENERATED]:  { projectId: string; marginPct: number }
  [EventType.CLIENT_ACCESS_GRANTED]:    { projectId: string; clientEmail: string }
  [EventType.CLIENT_INVITED]:           { projectId: string; clientEmail: string; inviteToken: string; invitedBy: string; clientAccessId: string }
  [EventType.CLIENT_ACCEPTED]:          { projectId: string; clientEmail: string; userId: string; clientAccessId: string }
  [EventType.EMAIL_FAILED]:             { projectId: string; clientEmail: string; clientAccessId: string; reason: string }
  [EventType.APPROVAL_REQUESTED]:       { projectId: string; approvalId: string; expiresAt: string }
  [EventType.APPROVAL_SUBMITTED]:       { projectId: string; approvalId: string; decision: 'APPROVED' | 'REJECTED' }
  [EventType.APPROVAL_EXPIRED]:         { projectId: string; approvalId: string }
  [EventType.PROJECT_CREATED]:          { projectId: string; createdBy: string }
  [EventType.PROJECT_STATUS_CHANGED]:   { projectId: string; from: string; to: string }
}

// ─── HELPER TIPADO PARA PUBLICAÇÃO ────────────────────────────────────────────

export type SystemEventPayload<T extends EventType> = {
  type: T
  projectId: string
  data: EventPayloadMap[T]
}
