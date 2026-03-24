import * as Sentry from '@sentry/nextjs'

// Configuração para Edge runtime (middleware, rotas Edge)
// Sample rate menor pois rotas Edge são chamadas em alta frequência
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // 5% em produção — menor que server/client por volume
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
})
