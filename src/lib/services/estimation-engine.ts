import { prisma } from '@/lib/db'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { createLogger } from '@/lib/logger'
import { BenchmarkMatcher } from './benchmark-matcher'
import { ConfidenceCalculator } from './confidence-calculator'
import { RiskFactorCalculator } from './risk-factor-calculator'
import type { AIEstimateResponse, AIEstimateItem } from '@/types/estimate'

const log = createLogger('estimation-engine')

// ─── HOURLY RATE DEFAULT ──────────────────────────────────────────────────────
const HOURLY_RATE_BRL = Number(process.env.HOURLY_RATE_BRL ?? '210')
const MARKET_MINIMUM_BRL = Number(process.env.MARKET_MINIMUM_BRL ?? '5000')

// ─── ESTIMATION ENGINE ────────────────────────────────────────────────────────

/**
 * Orquestrador principal do motor de estimativa.
 * Lê o brief, chama o Claude CLI (ou mock em test), parseia a resposta,
 * consulta benchmarks, calcula confiança e persiste os EstimateItems.
 */
export class EstimationEngine {
  static async generate(estimateId: string, briefId: string, userId: string): Promise<void> {
    try {
      // 1. Carregar contexto do brief
      const brief = await prisma.brief.findUnique({
        where: { id: briefId },
        include: {
          sessions: {
            include: { questions: { orderBy: { order: 'asc' } } },
            where: { status: 'COMPLETED' },
            take: 1,
          },
        },
      })
      if (!brief) throw new Error(`Brief ${briefId} não encontrado`)

      const questions = brief.sessions[0]?.questions ?? []

      // 2. Montar prompt para Claude CLI
      const briefContext = questions
        .map((q: { questionText: string; answerText?: string | null }) => `Q: ${q.questionText}\nA: ${q.answerText ?? 'Não respondido'}`)
        .join('\n\n')

      const prompt = `
Você é um estimador de projetos de software. Com base no brief a seguir, gere uma estimativa detalhada em formato JSON.

BRIEF DO PROJETO:
${briefContext || 'Brief sem perguntas respondidas.'}

FORMATO DE RESPOSTA (JSON puro, sem markdown):
{
  "items": [
    {
      "category": "backend-api",
      "description": "Descrição clara do componente",
      "hoursMin": 20,
      "hoursMax": 40,
      "riskFactor": 1.2
    }
  ]
}

REGRAS:
- Sempre use intervalos (hoursMin < hoursMax)
- riskFactor entre 1.0 (sem risco) e 1.5 (alto risco)
- Categorias permitidas: backend-api, frontend-component, frontend-page, auth-system, database-design, integration, testing, devops, mobile-screen, ai-ml
- Mínimo 5 itens, máximo 20
- Inclua testes como item separado (≥15% do total)
      `.trim()

      // 3. Chamar Claude CLI (ou mock em ambiente de teste)
      const rawResponse = await EstimationEngine.callAI(prompt)

      // 4. Parsear resposta
      let parsed: AIEstimateResponse
      try {
        parsed = JSON.parse(rawResponse) as AIEstimateResponse
        if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
          throw new Error('Resposta sem items válidos')
        }
      } catch (parseErr) {
        await prisma.estimate.update({
          where: { id: estimateId },
          data: { status: 'ARCHIVED', aiRawResponse: `PARSE_ERROR: ${String(parseErr)}\n${rawResponse}` },
        })
        throw parseErr
      }

      // 5. Enriquecer com benchmarks e calcular custos
      const enrichedItems = await Promise.all(
        parsed.items.map(async (item: AIEstimateItem) => {
          const risk = await RiskFactorCalculator.calculate(item.category, item.riskFactor, item.description)
          const benchmark = await BenchmarkMatcher.findBest(item.category)
          const benchmarkHit = benchmark !== null && benchmark.category === item.category
          return {
            category: item.category,
            description: item.description,
            hoursMin: item.hoursMin,
            hoursMax: item.hoursMax,
            riskFactor: risk,
            hourlyRate: HOURLY_RATE_BRL,
            costMin: item.hoursMin * HOURLY_RATE_BRL * risk,
            costMax: item.hoursMax * HOURLY_RATE_BRL * risk,
            benchmarkHit,
          }
        }),
      )

      const benchmarkCoverage = enrichedItems.filter(i => i.benchmarkHit).length
      log.info(
        { benchmarkCoverage, total: enrichedItems.length },
        `[EstimaAI] Benchmark coverage: ${benchmarkCoverage}/${enrichedItems.length} items`,
      )

      // 6. Calcular totais e validar mínimo de mercado
      const totalMin = enrichedItems.reduce((s, i) => s + i.hoursMin, 0)
      const totalMax = enrichedItems.reduce((s, i) => s + i.hoursMax, 0)
      const totalCostMin = enrichedItems.reduce((s, i) => s + i.costMin, 0)

      if (totalCostMin < MARKET_MINIMUM_BRL) {
        await prisma.estimate.update({
          where: { id: estimateId },
          data: {
            status: 'ARCHIVED',
            aiRawResponse: `ESTIMATE_050: totalCostMin ${totalCostMin.toFixed(2)} abaixo do mínimo ${MARKET_MINIMUM_BRL}`,
          },
        })
        throw new Error(`ESTIMATE_050: Custo total abaixo do mínimo de mercado`)
      }

      // 7. Calcular confiança
      const confidence = await ConfidenceCalculator.calculate(briefId, enrichedItems)

      // 8. Persistir items + atualizar Estimate para READY (transação atômica)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await prisma.$transaction(async (tx: any) => {
        await tx.estimateItem.createMany({
          data: enrichedItems.map(({ benchmarkHit: _, ...i }) => ({ estimateId, ...i })),
        })

        const updated = await tx.estimate.update({
          where: { id: estimateId },
          data: {
            totalMin,
            totalMax,
            confidence,
            status: 'READY',
            aiPrompt: prompt,
            aiRawResponse: rawResponse,
          },
        })

        // 9. Criar EstimateVersion imutável (snapshot inicial)
        await tx.estimateVersion.create({
          data: {
            estimateId,
            version: updated.version,
            snapshot: enrichedItems as unknown as object,
            reason: 'Geração inicial via EstimaAI',
            changedBy: userId,
          },
        })
      })

      // 10. Publicar evento
      const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } })
      if (estimate) {
        await EventBus.publish(
          EventType.ESTIMATE_CREATED,
          estimate.projectId,
          { estimateId, projectId: estimate.projectId, totalHours: totalMax },
        )
      }
    } catch (err) {
      // Se falhar em etapa não tratada, marcar como ARCHIVED
      const current = await prisma.estimate.findUnique({ where: { id: estimateId } })
      if (current && current.status === 'GENERATING') {
        await prisma.estimate.update({
          where: { id: estimateId },
          data: { status: 'ARCHIVED', aiRawResponse: String(err) },
        }).catch(() => {})
      }
      throw err
    }
  }

  /**
   * Chama o Claude CLI para geração de estimativa.
   * Em ambiente de teste (NODE_ENV=test), retorna uma resposta mock.
   */
  private static async callAI(prompt: string): Promise<string> {
    if (process.env.NODE_ENV === 'test') {
      return EstimationEngine.mockAIResponse()
    }

    // Importar o provider concreto dinamicamente para evitar dependência circular em testes
    let provider: import('@/lib/ai/provider').AIProvider
    try {
      const { ClaudeCliProvider } = await import('@/lib/ai/claude-cli-provider')
      provider = new ClaudeCliProvider()
    } catch {
      throw new Error('ClaudeCliProvider não disponível. Configure @/lib/ai/claude-cli-provider.')
    }

    return provider.generate(prompt, { maxTokens: 2000 })
  }

  private static mockAIResponse(): string {
    return JSON.stringify({
      items: [
        { category: 'auth-system', description: 'Autenticação JWT e RBAC', hoursMin: 16, hoursMax: 24, riskFactor: 1.1 },
        { category: 'backend-api', description: 'API REST de projetos', hoursMin: 30, hoursMax: 50, riskFactor: 1.0 },
        { category: 'database-design', description: 'Schema Prisma + migrations', hoursMin: 10, hoursMax: 16, riskFactor: 1.0 },
        { category: 'frontend-page', description: 'Dashboard principal', hoursMin: 20, hoursMax: 32, riskFactor: 1.1 },
        { category: 'frontend-component', description: 'Componentes UI compartilhados', hoursMin: 16, hoursMax: 24, riskFactor: 1.0 },
        { category: 'testing', description: 'Testes unitários e integração', hoursMin: 14, hoursMax: 20, riskFactor: 1.0 },
        { category: 'devops', description: 'CI/CD e deploy Vercel', hoursMin: 6, hoursMax: 10, riskFactor: 1.1 },
      ],
    })
  }
}
