export const ROUTES = {
  // Auth
  LOGIN: '/login',
  MFA_SETUP: '/auth/mfa/setup',
  MFA_VERIFY: '/auth/mfa/verify',
  INVITE: (token: string) => `/auth/invite/${token}`,

  // App
  DASHBOARD: '/dashboard',
  PROJECTS: '/projetos',
  PROJECT: (id: string) => `/projetos/${id}`,

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
  FORGOT_PASSWORD: '/auth/recuperar-senha',
  AUTH_CALLBACK: '/auth/callback',
} as const

export const API_ROUTES = {
  AUTH: {
    SIGNUP: '/api/auth/signup',
    INVITE: '/api/auth/invite',
    MFA_SETUP: '/api/auth/mfa/setup',
    MFA_VERIFY: '/api/auth/mfa/verify',
  },
  PROJECTS: '/api/projects',
  PROJECT: (id: string) => `/api/projects/${id}`,
  NOTIFICATIONS: '/api/notifications',
} as const
