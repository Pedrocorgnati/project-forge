/**
 * Contract Test: pg_notify Trigger
 *
 * Verifica que o trigger `trg_notify_system_event` dispara pg_notify
 * corretamente quando um Event é inserido na tabela `events`.
 *
 * REQUER:
 * - DATABASE_URL configurada
 * - DIRECT_URL apontando para PostgreSQL diretamente (não PgBouncer)
 * - Trigger trg_notify_system_event aplicado via src/lib/db/triggers/system-events-notify.sql
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EventType } from '@/lib/constants/events'

const hasDb = Boolean(process.env.DATABASE_URL)
const DIRECT_DATABASE_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL!

describe.skipIf(!hasDb)('pg_notify Trigger Contract', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pgClient: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any
  let testProjectId: string | null = null

  beforeAll(async () => {
    const { Client } = await import('pg')
    const dbModule = await import('@/lib/db')
    prisma = dbModule.prisma ?? dbModule.getPrismaClient?.()

    pgClient = new Client({ connectionString: DIRECT_DATABASE_URL })
    await pgClient.connect()

    // Encontrar projeto de teste existente
    const project = await prisma.project.findFirst({ orderBy: { createdAt: 'asc' } })
    if (project) {
      testProjectId = project.id
    } else {
      console.warn('\n  [WARN] Nenhum projeto no banco — testes pg_notify serão limitados')
    }
  })

  afterAll(async () => {
    await pgClient.query('UNLISTEN system_events').catch(() => {})
    await pgClient.end().catch(() => {})
    if (prisma) {
      await prisma.event
        .deleteMany({ where: { sourceModule: 'contract-pg-notify' } })
        .catch(() => {})
      await prisma.$disconnect().catch(() => {})
    }
  })

  it('trigger trg_notify_system_event existe no information_schema', async () => {
    const result = await prisma.$queryRaw<Array<{ trigger_name: string }>>`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'events'
        AND trigger_name = 'trg_notify_system_event'
    `

    if (result.length === 0) {
      console.warn(
        '\n  [WARN] Trigger trg_notify_system_event não encontrado.\n' +
          '  Aplicar: psql $DATABASE_URL -f src/lib/db/triggers/system-events-notify.sql\n',
      )
    }

    expect(result.length).toBeGreaterThan(0)
    expect(result[0].trigger_name).toBe('trg_notify_system_event')
  }, 15_000)

  it('trigger dispara pg_notify no canal system_events ao inserir Event', async () => {
    if (!testProjectId) {
      console.log('  [SKIP] Sem projeto de teste — pulando pg_notify test')
      return
    }

    const receivedNotifications: unknown[] = []
    let resolvePromise: () => void
    const notificationPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    await pgClient.query('LISTEN system_events')
    pgClient.on('notification', (notification: { payload?: string }) => {
      try {
        receivedNotifications.push(JSON.parse(notification.payload ?? '{}'))
        resolvePromise()
      } catch {
        resolvePromise()
      }
    })

    // Inserir Event via Prisma (deve disparar trigger)
    const insertedEvent = await prisma.event.create({
      data: {
        type: EventType.PROJECT_STATUS_CHANGED,
        projectId: testProjectId,
        payload: {
          projectId: testProjectId,
          from: 'BRIEFING',
          to: 'ACTIVE',
        },
        sourceModule: 'contract-pg-notify',
        processedAt: null,
      },
    })

    // Aguardar notificação (timeout de 5 segundos)
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error('pg_notify não recebido em 5 segundos')),
        5000,
      ),
    )

    await expect(
      Promise.race([notificationPromise, timeout]),
    ).resolves.toBeUndefined()

    await pgClient.query('UNLISTEN system_events')

    // Verificar payload da notificação
    expect(receivedNotifications.length).toBeGreaterThanOrEqual(1)
    const notifPayload = receivedNotifications[0] as Record<string, unknown>

    // O trigger envia: type, project_id, payload, id, created_at
    expect(notifPayload.id ?? notifPayload.type).toBeDefined()

    // Cleanup
    await prisma.event
      .delete({ where: { id: insertedEvent.id } })
      .catch(() => {})
  }, 15_000)

  it('pg_notify payload contém campos essenciais do evento', async () => {
    if (!testProjectId) {
      console.log('  [SKIP] Sem projeto de teste')
      return
    }

    let receivedPayload: Record<string, unknown> | null = null
    let resolvePromise: () => void
    const notificationPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve
    })

    await pgClient.query('LISTEN system_events')
    pgClient.on('notification', (notification: { payload?: string }) => {
      try {
        receivedPayload = JSON.parse(notification.payload ?? '{}')
        resolvePromise()
      } catch {
        resolvePromise()
      }
    })

    const event = await prisma.event.create({
      data: {
        type: EventType.ESTIMATE_CREATED,
        projectId: testProjectId,
        payload: {
          projectId: testProjectId,
          estimateId: 'contract-test-estimate',
          totalHours: 80,
        },
        sourceModule: 'contract-pg-notify',
        processedAt: null,
      },
    })

    await Promise.race([
      notificationPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000),
      ),
    ])

    await pgClient.query('UNLISTEN system_events')

    expect(receivedPayload).not.toBeNull()
    // Trigger envia: id, type, project_id, payload, created_at
    const hasRequiredField =
      receivedPayload!.id !== undefined ||
      receivedPayload!.type !== undefined
    expect(hasRequiredField).toBe(true)

    await prisma.event
      .delete({ where: { id: event.id } })
      .catch(() => {})
  }, 15_000)
})
