import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * @swagger
 * /api/healthz:
 *   get:
 *     tags: [Health]
 *     summary: Health check completo (DB + versão)
 *     description: Verifica conectividade com banco de dados e retorna versão da aplicação.
 *     security: []
 *     responses:
 *       200:
 *         description: Aplicação saudável
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok, degraded]
 *                 version:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 db:
 *                   type: string
 *                   enum: [connected, disconnected]
 *                 responseTime:
 *                   type: string
 *       503:
 *         description: Banco de dados indisponível
 */
export async function GET() {
  const startTime = Date.now()

  let dbStatus: 'connected' | 'disconnected' = 'disconnected'
  let dbError: string | undefined

  try {
    const prisma = getPrismaClient()
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'Unknown error'
  }

  const responseTime = Date.now() - startTime
  const isHealthy = dbStatus === 'connected'

  const payload = {
    status: isHealthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version ?? '0.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'unknown',
    db: dbStatus,
    responseTime: `${responseTime}ms`,
    ...(dbError && { dbError }),
  }

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
