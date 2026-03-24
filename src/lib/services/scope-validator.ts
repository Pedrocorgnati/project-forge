// ─── SCOPE VALIDATOR SERVICE ──────────────────────────────────────────────────
// module-10-scopeshield-validation / TASK-1 / ST001
// Motor de validação semântica via Claude CLI.
// Rastreabilidade: INT-066, INT-067

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { ScopeValidatorCache } from './scope-validator-cache'

// ─── SCHEMAS ──────────────────────────────────────────────────────────────────

const ValidationResultSchema = z.object({
  classification: z.enum(['IN_SCOPE', 'SCOPE_CREEP', 'OUT_OF_SCOPE', 'DUPLICATE']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  description: z.string(),
  rationale: z.string(),
  relatedTaskId: z.string().uuid().nullable().optional(),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

export interface ScopeValidationInput {
  taskId: string
  projectId: string
  taskTitle: string
  taskDescription?: string | null
}

export interface ScopeValidationOutput {
  result: ValidationResult | null
  fromCache: boolean
  degraded: boolean
}

// ─── SCOPE VALIDATOR ──────────────────────────────────────────────────────────

const AI_TIMEOUT_MS = 5000 // 5s SLA (PRD RF07)
const cache = new ScopeValidatorCache()

export class ScopeValidator {
  async validate(input: ScopeValidationInput): Promise<ScopeValidationOutput> {
    const cacheKey = `${input.projectId}:${input.taskId}`

    const cached = cache.get<ValidationResult>(cacheKey)
    if (cached) return { result: cached, fromCache: true, degraded: false }

    const context = await this.loadProjectContext(input.projectId)
    if (!context) {
      console.warn('[ScopeValidator] Projeto sem Brief — skip validação', { projectId: input.projectId })
      return { result: null, fromCache: false, degraded: true }
    }

    const prompt = this.buildPrompt(input, context)

    try {
      const rawResponse = await this.callAI(prompt)
      const parsed = this.parseResponse(rawResponse)

      if (!parsed) {
        console.warn('[ScopeValidator] Resposta inválida do Claude CLI — degraded', { raw: rawResponse.slice(0, 200) })
        return { result: null, fromCache: false, degraded: true }
      }

      cache.set(cacheKey, parsed)
      return { result: parsed, fromCache: false, degraded: false }
    } catch (err) {
      console.warn('[ScopeValidator] Claude CLI indisponível ou timeout — degraded', { error: String(err) })
      return { result: null, fromCache: false, degraded: true }
    }
  }

  private async callAI(prompt: string): Promise<string> {
    if (process.env.NODE_ENV === 'test') {
      return ScopeValidator.mockAIResponse()
    }

    let provider: import('@/lib/ai/provider').AIProvider
    try {
      const { ClaudeCliProvider } = await import('@/lib/ai/claude-cli-provider')
      provider = new ClaudeCliProvider()
    } catch {
      throw new Error('ClaudeCliProvider indisponível')
    }

    return Promise.race([
      provider.generate(prompt, { maxTokens: 500 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout após 5s')), AI_TIMEOUT_MS),
      ),
    ])
  }

  private static mockAIResponse(): string {
    return JSON.stringify({
      classification: 'IN_SCOPE',
      severity: 'LOW',
      description: 'Task dentro do escopo original do estimate.',
      rationale: 'Mock response para ambiente de teste.',
      relatedTaskId: null,
    })
  }

  private async loadProjectContext(projectId: string) {
    const [brief, estimate, tasks] = await Promise.all([
      prisma.brief.findFirst({
        where: { projectId },
        include: {
          sessions: {
            where: { status: 'COMPLETED' },
            include: { questions: { orderBy: { order: 'asc' } } },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.estimate.findFirst({
        where: { projectId, status: 'READY' },
        include: { items: { select: { category: true, description: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.findMany({
        where: { projectId },
        select: { id: true, title: true, description: true, status: true },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ])

    if (!brief) return null

    return { brief, estimate, existingTasks: tasks }
  }

  private buildPrompt(
    input: ScopeValidationInput,
    context: NonNullable<Awaited<ReturnType<typeof this.loadProjectContext>>>,
  ): string {
    const { brief, estimate, existingTasks } = context

    const questions = brief.sessions[0]?.questions ?? []
    const briefSummary = questions
      .filter((q: { questionText: string; answerText?: string | null }) => q.answerText)
      .map((q: { questionText: string; answerText?: string | null }) => `Q: ${q.questionText}\nA: ${q.answerText}`)
      .join('\n\n')
      || 'Brief não concluído'

    const estimateItems = estimate?.items.length
      ? estimate.items.map((i: { category: string; description: string }) => `- ${i.category}: ${i.description}`).join('\n')
      : 'Nenhum estimate disponível'

    const tasksList = existingTasks
      .filter((t: { id: string; title: string; description?: string | null }) => t.id !== input.taskId)
      .map((t: { id: string; title: string; description?: string | null }) => `- [${t.id}] ${t.title}${t.description ? ': ' + t.description.slice(0, 100) : ''}`)
      .join('\n')
      || 'Nenhuma task existente'

    return `Você é um validador de escopo de projeto de software. Analise objetivamente.

CONTEXTO DO PROJETO:
${briefSummary}

Estimate items (escopo aprovado):
${estimateItems}

Tasks existentes no projeto:
${tasksList}

NOVA TASK A VALIDAR:
Título: ${input.taskTitle}
Descrição: ${input.taskDescription ?? 'Sem descrição'}

Classifique esta task em uma das categorias:
1. IN_SCOPE: Dentro do escopo original do estimate
2. SCOPE_CREEP: Nova funcionalidade não prevista no estimate
3. OUT_OF_SCOPE: Contradiz ou está fora do brief do projeto
4. DUPLICATE: Semanticamente idêntica a task existente (forneça relatedTaskId)

Responda APENAS com JSON válido, sem markdown:
{"classification":"IN_SCOPE","severity":"LOW","description":"1 frase objetiva","rationale":"2-3 frases explicando","relatedTaskId":null}`
  }

  private parseResponse(raw: string): ValidationResult | null {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      const obj = JSON.parse(jsonMatch[0])
      const result = ValidationResultSchema.safeParse(obj)
      return result.success ? result.data : null
    } catch {
      return null
    }
  }
}
