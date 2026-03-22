import { z } from 'zod'
import { NotificationChannel } from '@prisma/client'

export const ListNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
})

export const UpdateNotificationPreferenceSchema = z.object({
  eventType: z.string().min(1).max(100),
  channel: z.nativeEnum(NotificationChannel),
  enabled: z.boolean(),
})

export type UpdateNotificationPreferenceInput = z.infer<typeof UpdateNotificationPreferenceSchema>
