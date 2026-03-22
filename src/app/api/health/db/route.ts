import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()

  try {
    const prisma = getPrismaClient()
    // Ping mínimo ao banco: consulta sem retornar dados
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start

    return NextResponse.json(
      {
        status: 'ok',
        service: 'database',
        latency_ms: latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const latencyMs = Date.now() - start
    const message = error instanceof Error ? error.message : 'Unknown database error'

    return NextResponse.json(
      {
        status: 'error',
        service: 'database',
        latency_ms: latencyMs,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
