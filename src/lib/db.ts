import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Retorna a instância singleton do PrismaClient.
 * Lazy initialization — NÃO instancia em module scope para compatibilidade
 * com o Next.js build (que avalia módulos sem DATABASE_URL disponível).
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
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
