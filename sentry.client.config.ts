import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,

  // Performance: 10% em prod, 100% em dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay: 10% sessões normais, 100% em erros
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,    // LGPD: mascara PII nos replays
      blockAllMedia: false,
    }),
  ],

  // Ignorar erros de extensões de browser (ruído)
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  beforeSend(event) {
    // Remover cookies antes de enviar (LGPD)
    if (event.request?.cookies) {
      event.request.cookies = {}
    }
    return event
  },
})
