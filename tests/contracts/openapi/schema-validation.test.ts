/**
 * Contract Test: OpenAPI Schema Validation
 *
 * Valida que a spec OpenAPI gerada é tecnicamente válida:
 * - Sem $ref quebradas
 * - Tipos e formatos corretos
 * - Conforme padrão OAS 3.x
 */
import { describe, it, expect } from 'vitest'
import SwaggerParser from '@apidevtools/swagger-parser'
import { getSwaggerSpec } from '@/lib/openapi/config'

describe('OpenAPI Schema Validation', () => {
  it('spec passa na validação formal OAS 3.x (@apidevtools/swagger-parser)', async () => {
    const spec = getSwaggerSpec()

    // SwaggerParser valida: referências $ref, tipos, formatos, required fields
    const validatedSpec = await SwaggerParser.validate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spec as any,
    )
    expect(validatedSpec).toBeDefined()
    expect((validatedSpec as Record<string, unknown>).openapi).toMatch(/^3\./)
  })

  it('spec não tem referências $ref quebradas', async () => {
    const spec = getSwaggerSpec()

    // dereference() falha se qualquer $ref não resolver
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SwaggerParser.dereference(spec as any),
    ).resolves.toBeDefined()
  })

  it('todos os schemas em components têm type ou composição definidos', () => {
    const spec = getSwaggerSpec()
    const schemas = (spec.components as Record<string, unknown>)?.schemas ?? {}

    for (const [name, schema] of Object.entries(
      schemas as Record<string, Record<string, unknown>>,
    )) {
      expect(
        schema.type ||
          schema.allOf ||
          schema.oneOf ||
          schema.anyOf ||
          schema['$ref'],
        `Schema '${name}' não tem type, allOf, oneOf, anyOf ou $ref`,
      ).toBeDefined()
    }
  })

  it('spec tem pelo menos 1 security scheme definido', () => {
    const spec = getSwaggerSpec()
    const securitySchemes =
      (spec.components as Record<string, unknown>)?.securitySchemes ?? {}
    expect(Object.keys(securitySchemes).length).toBeGreaterThan(0)
  })
})
