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
