// ─── ENUMS ────────────────────────────────────────────────────────────────────

export const BriefStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const
export type BriefStatus = (typeof BriefStatus)[keyof typeof BriefStatus]

export const SessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus]

// ─── DOMAIN INTERFACES ────────────────────────────────────────────────────────

export interface Brief {
  id: string
  projectId: string
  status: BriefStatus
  aiMetadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
  sessions?: BriefSession[]
}

export interface BriefSession {
  id: string
  briefId: string
  status: SessionStatus
  startedAt: Date
  completedAt: Date | null
  cancelledAt: Date | null
  createdAt: Date
  updatedAt: Date
  questions?: BriefQuestion[]
}

export interface BriefQuestion {
  id: string
  sessionId: string
  order: number
  questionText: string
  answerText: string | null
  aiMetadata: Record<string, unknown> | null
  createdAt: Date
  answeredAt: Date | null
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateBriefDTO {
  projectId: string
}

// ─── PRD TYPES ────────────────────────────────────────────────────────────────

export const PRDStatus = {
  GENERATING: 'GENERATING',
  READY: 'READY',
  ERROR: 'ERROR',
} as const
export type PRDStatus = (typeof PRDStatus)[keyof typeof PRDStatus]

export interface PRDDocument {
  id: string
  briefId: string
  version: number
  content: string
  generatedBy: string
  status: PRDStatus
  createdAt: Date // Sem updatedAt — imutável por design
}

export interface PRDGenerationContext {
  projectName: string
  projectDescription: string
  briefQA: Array<{ question: string; answer: string }>
}

// ─── AI SESSION TYPES ─────────────────────────────────────────────────────────

export interface AdaptiveQuestionContext {
  projectName: string
  projectDescription: string
  previousQA: Array<{ question: string; answer: string }>
  questionNumber: number
  totalExpected: number
}
