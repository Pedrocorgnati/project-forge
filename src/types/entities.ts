import type { Prisma, UserRole } from '@prisma/client'

// ─── TIPOS SIMPLES (direto do Prisma) ───────────────────────────────────────

export type User = Prisma.UserGetPayload<Record<string, never>>
export type Organization = Prisma.OrganizationGetPayload<Record<string, never>>
export type Project = Prisma.ProjectGetPayload<Record<string, never>>
export type ProjectMember = Prisma.ProjectMemberGetPayload<Record<string, never>>
export type Brief = Prisma.BriefGetPayload<Record<string, never>>
export type BriefSession = Prisma.BriefSessionGetPayload<Record<string, never>>
export type Document = Prisma.DocumentGetPayload<Record<string, never>>
export type DocumentVersion = Prisma.DocumentVersionGetPayload<Record<string, never>>
export type Estimate = Prisma.EstimateGetPayload<Record<string, never>>
export type EstimateItem = Prisma.EstimateItemGetPayload<Record<string, never>>
export type Task = Prisma.TaskGetPayload<Record<string, never>>
export type ScopeAlert = Prisma.ScopeAlertGetPayload<Record<string, never>>
export type ScopeBaseline = Prisma.ScopeBaselineGetPayload<Record<string, never>>
export type ChangeOrder = Prisma.ChangeOrderGetPayload<Record<string, never>>
export type TimesheetEntry = Prisma.TimesheetEntryGetPayload<Record<string, never>>
export type ProfitReport = Prisma.ProfitReportGetPayload<Record<string, never>>
export type RAGIndex = Prisma.RAGIndexGetPayload<Record<string, never>>
export type RAGDocument = Prisma.RAGDocumentGetPayload<Record<string, never>>
export type ClientAccess = Prisma.ClientAccessGetPayload<Record<string, never>>
export type ApprovalRequest = Prisma.ApprovalRequestGetPayload<Record<string, never>>
export type Notification = Prisma.NotificationGetPayload<Record<string, never>>
export type CostRate = Prisma.CostRateGetPayload<Record<string, never>>
export type AuditLog = Prisma.AuditLogGetPayload<Record<string, never>>
export type Event = Prisma.EventGetPayload<Record<string, never>>

// ─── TIPOS AUTENTICAÇÃO ──────────────────────────────────────────────────────

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: UserRole
  organizationId: string
}

// ─── TIPOS COMPOSTOS ─────────────────────────────────────────────────────────

export type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: { members: { include: { user: true } } }
}>

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    members: { include: { user: true } }
    briefs: true
    estimates: true
    tasks: true
  }
}>

export type BriefWithSession = Prisma.BriefGetPayload<{
  include: { sessions: true }
}>

export type EstimateWithItems = Prisma.EstimateGetPayload<{
  include: { items: true }
}>

export type ChangeOrderWithTasks = Prisma.ChangeOrderGetPayload<{
  include: { tasks: true }
}>

export type ApprovalRequestWithHistory = Prisma.ApprovalRequestGetPayload<{
  include: { history: true; client: true }
}>

export type UserWithOrg = Prisma.UserGetPayload<{
  include: { organization: true }
}>
