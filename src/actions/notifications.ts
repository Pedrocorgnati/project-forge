'use server'

import { prisma } from '@/lib/db'
import { requireServerUser } from '@/lib/auth/get-user'
import { toActionError } from '@/lib/errors'
import {
  ListNotificationsSchema,
  UpdateNotificationPreferenceSchema,
} from '@/schemas/notification.schema'
import type { UpdateNotificationPreferenceInput } from '@/schemas/notification.schema'
import { revalidatePath } from 'next/cache'

export async function getNotifications(params?: { unreadOnly?: boolean; page?: number; limit?: number }) {
  try {
    const user = await requireServerUser()
    const input = ListNotificationsSchema.parse(params ?? {})
    const skip = (input.page - 1) * input.limit

    const where = {
      userId: user.id,
      ...(input.unreadOnly ? { isRead: false } : {}),
    }

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: input.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ])

    return { data, total, unreadCount, page: input.page, limit: input.limit }
  } catch (error) {
    return toActionError(error)
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    const user = await requireServerUser()

    const data = await prisma.notification.update({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    })

    revalidatePath('/notificacoes')
    revalidatePath('/', 'layout') // atualiza badge de contagem no nav
    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function markAllNotificationsRead() {
  try {
    const user = await requireServerUser()

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    revalidatePath('/notificacoes')
    revalidatePath('/', 'layout') // atualiza badge de contagem no nav
    return { success: true }
  } catch (error) {
    return toActionError(error)
  }
}

export async function getNotificationPreferences() {
  try {
    const user = await requireServerUser()

    const data = await prisma.notificationPreference.findMany({
      where: { userId: user.id },
    })

    return { data }
  } catch (error) {
    return toActionError(error)
  }
}

export async function updateNotificationPreference(input: UpdateNotificationPreferenceInput) {
  try {
    const user = await requireServerUser()
    const validated = UpdateNotificationPreferenceSchema.parse(input)

    const data = await prisma.notificationPreference.upsert({
      where: {
        userId_eventType_channel: {
          userId: user.id,
          eventType: validated.eventType,
          channel: validated.channel,
        },
      },
      create: { userId: user.id, ...validated },
      update: { enabled: validated.enabled },
    })

    return { data }
  } catch (error) {
    return toActionError(error)
  }
}
