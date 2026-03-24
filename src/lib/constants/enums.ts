/**
 * ⚠️ DEPRECATED — NÃO IMPORTE DESTE ARQUIVO.
 *
 * Fonte canônica de enums: @prisma/client (gerado pelo Prisma).
 * Este arquivo existe apenas como referência documental.
 * Todos os imports no codebase usam @prisma/client.
 *
 * Para enums de board (TaskStatus com REVIEW, TaskPriority P0-P3):
 *   → importe de @/types/board
 */

export enum ProjectStatus {
  BRIEFING = 'BRIEFING',
  ESTIMATION = 'ESTIMATION',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
}

export enum ChangeOrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum UserRole {
  SOCIO = 'SOCIO',
  PM = 'PM',
  DEV = 'DEV',
  CLIENTE = 'CLIENTE',
}

export enum AlertTier {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum DocumentType {
  PRD = 'PRD',
  CHANGE_ORDER = 'CHANGE_ORDER',
  ESTIMATE = 'ESTIMATE',
  DELIVERY = 'DELIVERY',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  OBSOLETE = 'OBSOLETE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum EstimateStatus {
  GENERATING = 'GENERATING',
  READY = 'READY',
  ARCHIVED = 'ARCHIVED',
}

export enum ConfidenceLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ScopeResult {
  VALID = 'VALID',
  INVALID = 'INVALID',
  PARTIAL = 'PARTIAL',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
}

export enum ApprovalAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CLARIFICATION_REQUESTED = 'CLARIFICATION_REQUESTED',
}

export enum IndexationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
}

export const SeverityLevel = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const
export type SeverityLevel = (typeof SeverityLevel)[keyof typeof SeverityLevel]
