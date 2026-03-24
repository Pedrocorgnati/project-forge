import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check com verificação de dependências
 *     description: Readiness check — verifica DB. Retorna 'degraded' (HTTP 200) se DB indisponível.
 *     security: []
 *     responses:
 *       200:
 *         description: Serviço ativo (ok ou degraded)
 */
export async function GET() {
  const dbStart = Date.now()
  let dbStatus: 'ok' | 'degraded' = 'ok'
  let dbLatencyMs: number | null = null

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3_000)),
    ])
    dbLatencyMs = Date.now() - dbStart
  } catch {
    dbStatus = 'degraded'
  }

  const overall = dbStatus === 'ok' ? 'ok' : 'degraded'

  return NextResponse.json(
    {
      status: overall,
      service: 'project-forge',
      version: process.env.npm_package_version ?? '0.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbStatus,
          ...(dbLatencyMs !== null && { latencyMs: dbLatencyMs }),
        },
      },
    },
    { status: 200 },
  )
}
