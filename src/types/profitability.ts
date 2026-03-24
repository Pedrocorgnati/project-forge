import type { PeriodType } from '@prisma/client'

// ─── P&L RESULT ──────────────────────────────────────────────────────────────

export interface PLResult {
  period: PeriodType
  startDate: Date
  endDate: Date
  revenue: number
  revenueMid: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  billableHours: number
  nonBillableHours: number
  billableRatio: number
  teamCosts: TeamMemberCost[]
  hasEstimate: boolean
}

export interface TeamMemberCost {
  userId: string
  userName: string
  role: string
  hours: number
  billableHours: number
  effectiveRate: number
  rateSource: string
  cost: number
  pctOfTotal: number
}

// ─── BURN RATE ───────────────────────────────────────────────────────────────

export interface BurnRateResult {
  daysElapsed: number
  daysRemaining: number | null
  costPerDay: number
  projectedTotalCost: number
  projectedMargin: number
  projectedMarginPct: number
  isOverBudget: boolean
}

export interface CumulativeCostPoint {
  date: string
  cumulativeCost: number
  budget: number
}

// ─── TEAM BREAKDOWN ──────────────────────────────────────────────────────────

export interface MemberBreakdown {
  userId: string
  userName: string
  role: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  effectiveRate: number
  rateSource: string
  totalCost: number
  billableCost: number
  pctOfProjectCost: number
}

export interface RoleBreakdown {
  role: string
  memberCount: number
  totalHours: number
  totalCost: number
  pctOfProjectCost: number
  members: MemberBreakdown[]
}

export interface TeamBreakdownResult {
  byMember: MemberBreakdown[]
  byRole: RoleBreakdown[]
  totalCost: number
}

// ─── CHECKPOINT ──────────────────────────────────────────────────────────────

export interface CheckpointSnapshot {
  period: 'FULL'
  capturedAt: string
  revenue: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  billableHours: number
  billableRatio: number
  teamCosts: TeamMemberCost[]
  burnRate: BurnRateResult
}

export interface CheckpointSummary {
  id: string
  name: string
  createdAt: Date
  summary: {
    margin: number
    marginPct: number
    cost: number
    revenue: number
    hoursLogged: number
    isOverBudget: boolean
  }
  snapshotData?: CheckpointSnapshot
}

export interface CheckpointComparisonResult {
  checkpointA: { id: string; name: string; capturedAt: string }
  checkpointB: { id: string; name: string; capturedAt: string }
  metrics: Record<string, {
    a: number
    b: number
    delta: { absolute: number; pct: number; trend: 'up' | 'down' | 'flat' }
  }>
  teamComparison?: Array<{
    userId: string
    userName: string
    role: string
    hoursA: number
    hoursB: number
    costA: number
    costB: number
    costDelta: { absolute: number; pct: number; trend: 'up' | 'down' | 'flat' }
  }>
}

// ─── P&L PREVIEW (widget) ────────────────────────────────────────────────────

export interface PLPreviewData {
  revenue: number
  cost: number
  margin: number
  marginPct: number
  hoursLogged: number
  isOverBudget: boolean
}
