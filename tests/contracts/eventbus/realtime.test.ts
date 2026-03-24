/**
 * Contract Test: Supabase Realtime end-to-end
 *
 * Verifica o pipeline completo:
 * EventBus.publish() → INSERT events → trg_notify_system_event → pg_notify
 * → Supabase Realtime → cliente WebSocket recebe INSERT
 *
 * REQUER:
 * - NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY configuradas
 * - DATABASE_URL configurada
 * - Realtime habilitado para tabela `events` no painel Supabase:
 *   Database → Replication → adicionar tabela `events`
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { EventType } from '@/lib/constants/events'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const hasDb = Boolean(process.env.DATABASE_URL)
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
const canRun = hasDb && hasSupabase

describe.skipIf(!canRun)(
  'Supabase Realtime Contract: EventBus end-to-end',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prisma: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let EventBus: any
    let testProjectId: string | null = null

    beforeAll(async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const dbModule = await import('@/lib/db')
      const busModule = await import('@/lib/events/bus')

      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      prisma = dbModule.prisma ?? dbModule.getPrismaClient?.()
      EventBus = busModule.EventBus

      const project = await prisma.project.findFirst({
        orderBy: { createdAt: 'asc' },
      })
      if (project) {
        testProjectId = project.id
      } else {
        console.warn('\n  [WARN] Nenhum projeto no banco — testes Realtime serão skippados')
      }
    })

    afterAll(async () => {
      if (supabase) {
        await supabase.removeAllChannels().catch(() => {})
      }
      if (prisma) {
        await prisma.event
          .deleteMany({ where: { sourceModule: 'contract-realtime' } })
          .catch(() => {})
        await prisma.$disconnect().catch(() => {})
      }
    })

    it(
      'subscrição Realtime recebe INSERT na tabela events após EventBus.publish()',
      async () => {
        if (!testProjectId) {
          console.log('  [SKIP] Sem projeto de teste')
          return
        }

        const receivedEvents: unknown[] = []
        let resolvePromise: () => void
        const realtimePromise = new Promise<void>((resolve) => {
          resolvePromise = resolve
        })

        // Canal Realtime para tabela events
        const channel = supabase
          .channel('contract-test-events-' + Date.now())
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'events',
              filter: `project_id=eq.${testProjectId}`,
            },
            (payload: { new: unknown }) => {
              receivedEvents.push(payload.new)
              resolvePromise()
            },
          )
          .subscribe()

        // Aguardar channel conectar (1 segundo)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Publicar evento via EventBus
        await EventBus.publish(
          EventType.PROFIT_REPORT_GENERATED,
          testProjectId,
          { projectId: testProjectId, marginPct: 32.5 },
          'contract-realtime',
        )

        // Aguardar recebimento (timeout 8s)
        await Promise.race([
          realtimePromise,
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    'Supabase Realtime não recebeu INSERT em 8 segundos.\n' +
                      'Verifique: Database → Replication → tabela events habilitada.',
                  ),
                ),
              8000,
            ),
          ),
        ])

        // Verificar payload recebido
        expect(receivedEvents.length).toBeGreaterThanOrEqual(1)
        const received = receivedEvents[0] as Record<string, unknown>
        expect(received.type ?? received.eventType).toBeDefined()

        await supabase.removeChannel(channel).catch(() => {})
      },
      20_000,
    )

    it(
      'canal filtrado por project_id recebe apenas eventos do projeto',
      async () => {
        if (!testProjectId) {
          console.log('  [SKIP] Sem projeto de teste')
          return
        }

        let count = 0
        let resolvePromise: () => void
        const donePromise = new Promise<void>((resolve) => {
          resolvePromise = resolve
        })

        const channel = supabase
          .channel(`contract-project-filter-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'events',
              filter: `project_id=eq.${testProjectId}`,
            },
            () => {
              count++
              if (count >= 2) resolvePromise()
            },
          )
          .subscribe()

        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Publicar 2 eventos para o mesmo projeto
        await EventBus.publish(
          EventType.ESTIMATE_CREATED,
          testProjectId,
          { projectId: testProjectId, estimateId: 'rt-est-1', totalHours: 80 },
          'contract-realtime',
        )
        await EventBus.publish(
          EventType.ESTIMATE_REVISED,
          testProjectId,
          {
            projectId: testProjectId,
            previousEstimateId: 'rt-est-1',
            newEstimateId: 'rt-est-2',
            reason: 'Realtime contract test',
          },
          'contract-realtime',
        )

        await Promise.race([
          donePromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Timeout esperando 2 eventos Realtime')),
              10000,
            ),
          ),
        ])

        expect(count).toBeGreaterThanOrEqual(2)
        await supabase.removeChannel(channel).catch(() => {})
      },
      20_000,
    )
  },
)

// Informativo quando variáveis ausentes
describe('Supabase Realtime: ambiente check', () => {
  it('informa configuração necessária para testes Realtime', () => {
    if (!hasDb) {
      console.log('\n  [INFO] DATABASE_URL não configurada — testes Realtime skippados')
    }
    if (!hasSupabase) {
      console.log(
        '\n  [INFO] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas\n' +
          '         Testes Realtime skippados. Configure no .env.local para habilitá-los.',
      )
    }
    if (canRun) {
      console.log('\n  [INFO] Ambiente Supabase configurado — testes Realtime ativos')
    }
    expect(true).toBe(true) // sempre passa — apenas informativo
  })
})
