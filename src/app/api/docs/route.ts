import { NextResponse } from 'next/server'
import { getSwaggerSpec } from '@/lib/openapi/config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * @swagger
 * /api/docs:
 *   get:
 *     tags: [Health]
 *     summary: OpenAPI 3.x spec (desenvolvimento only)
 *     description: Retorna a especificação OpenAPI gerada automaticamente a partir das anotações JSDoc das rotas. Disponível apenas em NODE_ENV=development.
 *     security: []
 *     responses:
 *       200:
 *         description: Spec OpenAPI 3.x válida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       403:
 *         description: Não disponível em produção
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production', code: 'FORBIDDEN' },
      { status: 403 },
    )
  }

  const spec = getSwaggerSpec()
  return NextResponse.json(spec)
}
