// ─── BARREL: @/lib ────────────────────────────────────────────────────────────
// Sempre importar via: import { ... } from '@/lib'
// Nunca importar de subpastas diretamente.

// Utils
export * from './utils/format'
export * from './utils/validate'
export * from './utils/api'
export * from './utils/handle-error'
export { cn } from './utils'
export * from './utils/index'

// Constants
export * from './constants/enums'
export * from './constants/events'
export * from './constants/routes'
export * from './constants/api-routes'
export * from './constants/messages'
export * from './constants/timing'
export * from './constants/notifications'
export * from './constants/query-keys'
export * from './constants/errors'

// Services
export * from './services/base'

// AI
export * from './ai/provider'
export * from './ai/health-check'
export * from './ai/circuit-breaker'
export * from './ai/claude-cli-provider'

// RBAC
export * from './rbac/constants'
export * from './rbac/permissions'

// API middleware
export * from './api/with-auth'
export * from './api/assert-project-access'

// Realtime
export * from './realtime/subscription'

// Schemas
export * from './schemas/base'

// Hooks
export * from './hooks/use-debounce'
export * from './hooks/use-local-storage'
export * from './hooks/use-media-query'
export * from './hooks/use-disclosure'
export * from './hooks/use-async-state'
export * from './hooks/use-copy-to-clipboard'
export * from './hooks/use-permissions'
export * from './hooks/use-ai'

// AI Context
export * from './ai/context'

// Events
export * from './events/event-bus-client'
export { EventBus, EventBroadcaster, EventWorker, getHandlersForType } from './events'
export type { EventHandler, EventPayload } from './events'

// Notifications
export { NotificationService, checkAntiFatigue, isQuietHoursNow } from './notifications'
export type { SendNotificationParams } from './notifications'
export { EmailQueue, NotificationScheduler } from './notifications'

// Hooks — Notifications + Realtime
export { useNotifications } from './hooks/use-notifications'
export { useRealtimeEvents } from './hooks/use-realtime-events'
