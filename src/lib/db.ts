import 'server-only'
import { PrismaClient } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('prisma')

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any | undefined
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Middleware de performance via $extends (Prisma 5+): loga queries lentas
  // WARNING: > 500ms | ERROR: > 2000ms | DEBUG em dev: > 100ms
  return base.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: { model: string; operation: string; args: unknown; query: (args: unknown) => Promise<unknown> }) {
          const startTime = Date.now()
          try {
            const result = await query(args)
            const duration = Date.now() - startTime
            const context = { model, action: operation, duration }
            if (duration > 2000) {
              log.error(context, `Query crítica: ${model}.${operation} demorou ${duration}ms`)
            } else if (duration > 500) {
              log.warn(context, `Query lenta: ${model}.${operation} demorou ${duration}ms`)
            } else if (process.env.NODE_ENV === 'development' && duration > 100) {
              log.debug(context, `Query: ${model}.${operation} (${duration}ms)`)
            }
            return result
          } catch (err) {
            const duration = Date.now() - startTime
            log.error({ model, action: operation, duration }, `Query error: ${model}.${operation}`)
            throw err
          }
        },
      },
    },
  })
}

/**
 * Retorna a instância singleton do PrismaClient.
 * Lazy initialization — NÃO instancia em module scope para compatibilidade
 * com o Next.js build (que avalia módulos sem DATABASE_URL disponível).
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Proxy lazy para compatibilidade com imports existentes: `import { prisma } from '@/lib/db'`
 * O PrismaClient é instanciado apenas na primeira chamada de método, não no import.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
