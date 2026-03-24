export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
    members: (id: string) => ['projects', id, 'members'] as const,
  },
  briefs: {
    byProject: (projectId: string) => ['briefs', projectId] as const,
    detail: (projectId: string, briefId: string) => ['briefs', projectId, briefId] as const,
  },
  estimates: {
    all: ['estimates'] as const,
    byProject: (projectId: string) => ['estimates', projectId] as const,
    detail: (projectId: string, id: string) => ['estimates', projectId, id] as const,
    versions: (estimateId: string) => ['estimates', 'versions', estimateId] as const,
  },
  benchmarks: {
    all: ['benchmarks'] as const,
    byEstimate: (estimateId: string) => ['benchmarks', estimateId] as const,
  },
  tasks: {
    byProject: (projectId: string) => ['tasks', projectId] as const,
    detail: (projectId: string, taskId: string) => ['tasks', projectId, taskId] as const,
  },
  scope: {
    byProject: (projectId: string) => ['scope', projectId] as const,
  },
  changeOrders: {
    byProject: (projectId: string) => ['changeOrders', projectId] as const,
    detail: (projectId: string, id: string) => ['changeOrders', projectId, id] as const,
  },
  handoff: {
    byProject: (projectId: string) => ['handoff', projectId] as const,
  },
  timesheet: {
    byProject: (projectId: string) => ['timesheet', projectId] as const,
  },
  profitability: {
    byProject: (projectId: string) => ['profitability', projectId] as const,
  },
  approvals: {
    byProject: (projectId: string) => ['approvals', projectId] as const,
    detail: (projectId: string, id: string) => ['approvals', projectId, id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
} as const

// QUERY_KEYS — superset canônico (estimates originais + demais domínios migrados para React Query)
export const QUERY_KEYS = {
  estimates: {
    all: ['estimates'] as const,
    byProject: (projectId: string) => ['estimates', projectId] as const,
    detail: (estimateId: string) => ['estimates', 'detail', estimateId] as const,
    versions: (estimateId: string) => ['estimates', 'versions', estimateId] as const,
  },
  benchmarks: {
    all: ['benchmarks'] as const,
    byEstimate: (estimateId: string) => ['benchmarks', estimateId] as const,
  },
  changeOrders: {
    byProject: (projectId: string, statusFilter?: string) =>
      statusFilter ? ['changeOrders', projectId, statusFilter] as const : ['changeOrders', projectId] as const,
  },
  baselines: {
    byProject: (projectId: string) => ['baselines', projectId] as const,
    detail: (projectId: string, baselineId: string) => ['baselines', projectId, baselineId] as const,
  },
  checkpoints: {
    byProject: (projectId: string) => ['checkpoints', projectId] as const,
    comparison: (projectId: string, aId: string, bId: string) =>
      ['checkpoints', projectId, 'compare', aId, bId] as const,
  },
  costConfig: {
    byProject: (projectId: string) => ['costConfig', projectId] as const,
  },
  plPreview: {
    byProject: (projectId: string) => ['plPreview', projectId] as const,
  },
  profitReport: {
    byProject: (projectId: string, period: string) => ['profitReport', projectId, period] as const,
  },
  burnRateTimeline: {
    byProject: (projectId: string) => ['burnRateTimeline', projectId] as const,
  },
  scopeAlerts: {
    byProject: (projectId: string, statusFilter?: string) =>
      statusFilter ? ['scopeAlerts', projectId, statusFilter] as const : ['scopeAlerts', projectId] as const,
  },
  scopeValidation: {
    health: () => ['scopeValidation', 'health'] as const,
  },
  timesheet: {
    byProject: (projectId: string, week?: string, userId?: string) =>
      ['timesheet', projectId, week ?? '', userId ?? ''] as const,
  },
  timesheetSummary: {
    byProject: (projectId: string, userId?: string) =>
      ['timesheetSummary', projectId, userId ?? ''] as const,
  },
  projectImpact: {
    byProject: (projectId: string) => ['projectImpact', projectId] as const,
  },
} as const
