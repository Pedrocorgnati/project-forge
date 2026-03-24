import type { Options } from 'swagger-jsdoc'

// ─── SWAGGER CONFIG ───────────────────────────────────────────────────────────

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ProjectForge API',
      version: process.env.npm_package_version ?? '0.1.0',
      description:
        'PSA (Professional Services Automation) API — ProjectForge. ' +
        'Gestão de projetos de serviços: brief → estimativa → execução → P&L → portal do cliente.',
      contact: {
        name: 'ProjectForge Team',
        email: 'pedro@corgnati.com',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      {
        url: 'https://projectforge.vercel.app',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT token',
        },
        SessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sb-access-token',
          description: 'Supabase session cookie (browser)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error', 'code'],
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer' },
            hasMore: { type: 'boolean' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'System health checks' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Briefs', description: 'Brief sessions e PRD (Rock 1 — BriefForge)' },
      { name: 'Estimates', description: 'Estimativas de projeto (Rock 2 — EstimAI)' },
      { name: 'Tasks', description: 'Scope board e tasks (Rock 3 — ScopeShield)' },
      { name: 'ChangeOrders', description: 'Change orders (Rock 3 — ScopeShield)' },
      { name: 'RAG', description: 'Indexação e consulta RAG (Rock 4 — HandoffAI)' },
      { name: 'Rentabilia', description: 'Timesheets e P&L (Rock 5 — Rentabilia)' },
      { name: 'ClientPortal', description: 'Portal do cliente (Rock 6 — ClientPortal)' },
      { name: 'Approvals', description: 'Aprovações de documentos' },
      { name: 'Notifications', description: 'Notificações do sistema' },
    ],
  },
  // Escanear todas as rotas API para JSDoc @swagger
  apis: ['./src/app/api/**/*.ts', './src/lib/openapi/schemas/**/*.ts'],
}

// ─── SPEC SINGLETON (cache em memória) ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cachedSpec: any | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSwaggerSpec(): any {
  if (!_cachedSpec) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swaggerJsdoc = require('swagger-jsdoc')
    _cachedSpec = swaggerJsdoc(swaggerOptions)
  }
  return _cachedSpec
}
