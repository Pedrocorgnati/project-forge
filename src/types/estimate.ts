import type { ConfidenceLevel, EstimateStatus } from '@prisma/client'

// ─── ENUMS ────────────────────────────────────────────────────────────────────

export { ConfidenceLevel, EstimateStatus }

// ─── TIPOS BASE ───────────────────────────────────────────────────────────────

export interface EstimateItemData {
  category: string
  description: string
  hoursMin: number
  hoursMax: number
  hourlyRate: number
  riskFactor: number
  costMin: number
  costMax: number
}

export interface EstimateVersionData {
  id: string
  estimateId: string
  version: number
  snapshot: EstimateItemData[]
  reason: string | null
  changedBy: string
  createdAt: Date
}

export interface EstimateData {
  id: string
  projectId: string
  briefId: string | null
  createdBy: string
  version: number
  totalMin: number
  totalMax: number
  currency: string
  confidence: ConfidenceLevel
  status: EstimateStatus
  aiPrompt: string | null
  aiRawResponse: string | null
  createdAt: Date
  updatedAt: Date
}

export interface EstimateWithItems extends EstimateData {
  items: EstimateItemData[]
}

export interface EstimateWithHistory extends EstimateData {
  items: EstimateItemData[]
  versions: EstimateVersionData[]
}

// ─── AI RESPONSE ──────────────────────────────────────────────────────────────

export interface AIEstimateItem {
  category: string
  description: string
  hoursMin: number
  hoursMax: number
  riskFactor: number
}

export interface AIEstimateResponse {
  items: AIEstimateItem[]
}
