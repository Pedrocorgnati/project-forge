// UI-specific types for the EstimaAI module (module-8)
// Domain types (EstimateStatus, ConfidenceLevel, EstimateItemData, etc.) live in @/types/estimate

import type { ConfidenceLevel, EstimateStatus } from '@/types/estimate'

export type { ConfidenceLevel, EstimateStatus }

// ─── CARD ─────────────────────────────────────────────────────────────────────

export interface EstimateCardProps {
  estimate: {
    id: string
    projectId: string
    version: number
    status: EstimateStatus
    totalMin: number
    totalMax: number
    currency: string
    confidence: ConfidenceLevel
    createdAt: Date | string
    _count?: { items: number }
  }
  className?: string
}

// ─── DETAIL ───────────────────────────────────────────────────────────────────

export interface EstimateDetailProps {
  estimateId: string
  projectId: string
  userRole: string
}

// ─── ITEM ─────────────────────────────────────────────────────────────────────

export interface EstimateItemProps {
  id: string
  category: string
  description: string
  hoursMin: number
  hoursMax: number
  hourlyRate: number
  riskFactor: number
  costMin: number
  costMax: number
}

// ─── BENCHMARK ────────────────────────────────────────────────────────────────

export interface BenchmarkData {
  category: string
  p25: number
  avg: number
  p75: number
}
