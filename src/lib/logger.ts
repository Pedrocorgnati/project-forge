import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'
const logLevel = process.env.LOG_LEVEL ?? (isDevelopment ? 'debug' : 'warn')

export const logger = pino({
  level: logLevel,

  // Desenvolvimento: output legível com cores via pino-pretty
  // Produção: JSON puro para agregadores (Vercel logs, Datadog, etc.)
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Campos base presentes em todos os logs
  base: {
    env: process.env.NODE_ENV,
    version: process.env.npm_package_version,
  },

  // Redact automático de campos sensíveis (LGPD/segurança)
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },

  // Serializers para objetos comuns
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

/**
 * Cria um child logger com contexto de módulo.
 *
 * @example
 * const log = createLogger('briefforge')
 * log.info({ sessionId }, 'Brief session criada')
 * log.error({ err, sessionId }, 'Falha ao gerar PRD')
 */
export const createLogger = (module: string) => logger.child({ module })
