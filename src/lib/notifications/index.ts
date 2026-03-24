// ─── NOTIFICATIONS BARREL ─────────────────────────────────────────────────────

export { NotificationService } from './service'
export type { SendNotificationParams } from './service'
export { checkAntiFatigue, isQuietHoursNow } from './anti-fatigue'
export { InAppChannel } from './channels/in-app'
export { EmailChannel } from './channels/email'
export { EmailQueue } from './email-queue'
export { NotificationScheduler } from './scheduler'
