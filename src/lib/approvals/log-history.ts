// src/lib/approvals/log-history.ts
// module-17-clientportal-approvals / TASK-1 ST005
// Helper imutável: registra toda mudança de estado em approval_history
// Rastreabilidade: INT-106

import { prisma } from '@/lib/db'

// NOTE: Local type extends shared enum with approval-specific actions (GAP-017)
// Shared enum at src/lib/constants/enums.ts covers: APPROVED, REJECTED, CLARIFICATION_REQUESTED
// Module-17 adds: CREATED, REMINDER_SENT, EXPIRED, CANCELLED
export type ApprovalAction =
  | 'CREATED'
  | 'REMINDER_SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'

export async function logApprovalHistory({
  approvalId,
  action,
  comment,
  actorId,
}: {
  approvalId: string
  action: ApprovalAction
  comment?: string
  actorId?: string // undefined para ações automáticas do sistema (cron)
}) {
  return prisma.approvalHistory.create({
    data: {
      approvalRequestId: approvalId,
      action,
      comment: comment ?? null,
      actorId: actorId ?? null,
    },
  })
}
