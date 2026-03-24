import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ServiceStatus {
  status: 'ok' | 'error'
  latency_ms?: number
  error?: string
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const prisma = getPrismaClient()
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', latency_ms: Date.now() - start }
  } catch (error) {
    return {
      status: 'error',
      latency_ms: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database unreachable',
    }
  }
}

function checkEnvironment(): ServiceStatus {
  const required = [
    'DATABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    return { status: 'error', error: `Missing env vars: ${missing.join(', ')}` }
  }
  return { status: 'ok' }
}

export async function GET() {
  const [dbStatus, envStatus] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkEnvironment()),
  ])

  const services = {
    database: dbStatus,
    environment: envStatus,
  }

  const allOk = Object.values(services).every((s) => s.status === 'ok')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      services,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  )
}
