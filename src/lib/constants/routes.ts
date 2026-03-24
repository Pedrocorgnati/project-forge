export const ROUTES = {
  // Auth
  LOGIN: '/login',
  MFA_SETUP: '/mfa/setup',
  MFA_VERIFY: '/mfa/verify',
  INVITE: (token: string) => `/invite/${token}`,

  // App
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT: (id: string) => `/projects/${id}`,

  // Modules
  BRIEFFORGE: '/briefforge',
  ESTIMAI: '/estimai',
  SCOPESHIELD: '/scopeshield',
  HANDOFFAI: '/handoffai',
  RENTABILIA: '/rentabilia',
  BOARD: '/board',
  PORTAL: '/portal',

  // Settings
  SETTINGS: '/configuracoes',
  PROFILE: '/perfil',
  NOTIFICATIONS: '/notificacoes',

  // Auth
  FORGOT_PASSWORD: '/recuperar-senha',
  AUTH_CALLBACK: '/api/auth/callback',

  // Module sub-routes (with projectId)
  BRIEFFORGE_SESSION: (projectId: string) => `/briefforge/${projectId}`,
  BRIEFFORGE_PRD: (projectId: string) => `/briefforge/${projectId}/prd`,

  // Project sub-routes
  PROJECT_BRIEF: (projectId: string) => `/briefforge/${projectId}`,
  PROJECT_ESTIMATE: (projectId: string) => `/projects/${projectId}/estimate`,
  PROJECT_SCOPE: (projectId: string) => `/projects/${projectId}/scope`,
  PROJECT_HANDOFF: (projectId: string) => `/projects/${projectId}/handoff`,
  PROJECT_HANDOFF_QA: (projectId: string) => `/projects/${projectId}/handoff/qa`,
  PROJECT_PROFITABILITY: (projectId: string) => `/projects/${projectId}/profitability`,
  PROJECT_BOARD: (projectId: string) => `/projects/${projectId}/board`,
  PROJECT_TIMESHEET: (projectId: string) => `/projects/${projectId}/timesheet`,
  PROJECT_CHANGE_ORDERS: (projectId: string) => `/projects/${projectId}/change-orders`,
  PROJECT_SCOPE_ALERTS: (projectId: string) => `/projects/${projectId}/scope-alerts`,
  PROJECT_ESTIMATES_COMPARE: (projectId: string) => `/projects/${projectId}/estimates/compare`,
  PROJECT_APPROVALS: (projectId: string) => `/projects/${projectId}/approvals`,
  PROJECT_APPROVAL_DETAIL: (projectId: string, approvalId: string) => `/projects/${projectId}/approvals/${approvalId}`,
  PROJECT_ESTIMATE_DETAIL: (projectId: string, estimateId: string) => `/projects/${projectId}/estimates/${estimateId}`,
  PROJECT_ESTIMATE_COMPARE_WITH: (projectId: string, estimateId: string, compareId: string) => `/projects/${projectId}/estimates/${estimateId}/compare?with=${compareId}`,
  PROJECT_BOARD_TASK: (projectId: string, taskId: string) => `/projects/${projectId}/board?task=${taskId}`,

  // Portal static routes
  PORTAL_APPROVALS_LIST: '/portal/approvals',
  PORTAL_APPROVAL_DETAIL: (approvalId: string) => `/portal/approvals/${approvalId}`,
  PORTAL_CLIENT_DASHBOARD: '/portal/dashboard',

  // Portal sub-routes
  PORTAL_PROJECT: (id: string) => `/portal/${id}`,
  PORTAL_APPROVAL: (projectId: string, approvalId: string) => `/portal/${projectId}/approvals/${approvalId}`,
  PORTAL_DOCUMENTS: (projectId: string) => `/portal/${projectId}/documents`,
  PORTAL_DASHBOARD: (token: string) => `/portal/${token}/dashboard`,

  // Settings sub-routes
  SETTINGS_NOTIFICATIONS: '/configuracoes/notificacoes',
  SETTINGS_CUSTOS: '/configuracoes/custos',
  SETTINGS_PROFILE: '/perfil',

  // Public/Legal
  TERMS: '/terms',
  PRIVACY: '/privacy',
} as const

// API routes are defined in constants/api-routes.ts — import from there
