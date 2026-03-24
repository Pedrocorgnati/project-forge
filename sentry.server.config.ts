import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,

  // 10% de traces em produção para reduzir volume
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Não capturar PII de requests
  sendDefaultPii: false,
})
