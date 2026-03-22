import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

class PrismaClientSingleton {
  private static instance: PrismaClient | undefined

  static getInstance(): PrismaClient {
    if (!this.instance) {
      this.instance =
        globalForPrisma.prisma ??
        new PrismaClient({
          log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        })

      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = this.instance
      }
    }
    return this.instance
  }
}

export const getPrismaClient = () => PrismaClientSingleton.getInstance()
export const prisma = PrismaClientSingleton.getInstance()
