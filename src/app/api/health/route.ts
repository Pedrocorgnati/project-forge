import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'project-forge',
      version: process.env.npm_package_version ?? '0.0.0',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
