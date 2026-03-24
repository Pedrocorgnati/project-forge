import { type NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'http' })

// Paths a excluir do logging (reduz ruído)
const SKIP_PATHS = [
  '/api/healthz',
  '/api/health',
  '/_next/',
  '/favicon.ico',
  '/static/',
]

export async function withRequestLogging(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const { method, nextUrl } = request
  const pathname = nextUrl.pathname

  // Skip paths de assets e health check
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
    return next()
  }

  const startTime = Date.now()
  const requestId = crypto.randomUUID()

  // Propagar request ID para rastreabilidade end-to-end
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  let response: NextResponse
  try {
    response = await next()
  } catch (error) {
    const duration = Date.now() - startTime
    log.error(
      { method, pathname, duration, requestId, err: error },
      'Request error'
    )
    throw error
  }

  const duration = Date.now() - startTime
  const status = response.status

  // Nível de log por status code
  const logFn =
    status >= 500
      ? log.error.bind(log)
      : status >= 400
        ? log.warn.bind(log)
        : log.info.bind(log)

  logFn({ method, pathname, status, duration, requestId }, 'Request')

  // Propagar request ID na resposta para correlação de logs
  response.headers.set('x-request-id', requestId)
  return response
}
