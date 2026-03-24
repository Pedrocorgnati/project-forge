import { ClaudeCliProvider } from '@/lib/ai/claude-cli-provider'
import { EventBus } from '@/lib/events/bus'
import { EventType } from '@/lib/constants/events'
import { DocumentService } from './document-service'
import type { Brief, BriefSession, BriefQuestion, PRDGenerationContext } from '@/types/briefforge'

// ─── PRD GENERATOR ────────────────────────────────────────────────────────────

/**
 * Monta contexto completo do brief e chama Claude CLI para gerar PRD estruturado.
 * Persiste resultado via DocumentService (append-only).
 * Publica BRIEF_PRD_GENERATED no EventBus após geração bem-sucedida.
 */
export class PRDGenerator {
  private static readonly provider = new ClaudeCliProvider()

  private static readonly SYSTEM_PROMPT = `
Você é um especialista em Product Management e Requirements Engineering.
Com base nas respostas de uma entrevista de briefing, gere um PRD (Product Requirements Document)
completo e estruturado em Markdown. O documento deve conter:

1. **Visão Geral do Produto** — objetivo, problema resolvido, proposta de valor
2. **Escopo** — o que está incluído e o que está explicitamente excluído
3. **Usuários-Alvo** — personas e casos de uso primários
4. **Requisitos Funcionais** — lista priorizada (MUST/SHOULD/COULD)
5. **Requisitos Não-Funcionais** — performance, segurança, escalabilidade
6. **Restrições e Premissas** — técnicas, de prazo, orçamento
7. **Critérios de Sucesso** — métricas mensuráveis de aceitação

Seja específico, evite ambiguidades. Use o idioma das respostas do briefing.
`.trim()

  /**
   * Gera PRD completo a partir de um brief concluído.
   * Chama DocumentService.finalizeGeneration() ao concluir.
   * Publica BRIEF_PRD_GENERATED no EventBus.
   *
   * Fire-and-forget: erros são capturados e marcados em DocumentService.markError().
   */
  static async generate(
    prdDocId: string,
    brief: Brief & { sessions: Array<BriefSession & { questions: BriefQuestion[] }> },
    generatedBy: string,
  ): Promise<void> {
    const context = await PRDGenerator.buildContext(brief)
    const userMessage = PRDGenerator.buildUserMessage(context)

    const content = await PRDGenerator.provider.generate(userMessage, {
      system: PRDGenerator.SYSTEM_PROMPT,
      maxTokens: 4096,
      temperature: 0.3, // baixa temperatura para consistência
    })

    // Persiste conteúdo gerado (única atualização permitida: GENERATING → READY)
    const finalDoc = await DocumentService.finalizeGeneration(prdDocId, content)

    // Publica evento — notificações enviadas pelo handler em brief-handlers.ts
    await EventBus.publish(
      EventType.BRIEF_PRD_GENERATED,
      brief.projectId,
      {
        projectId: brief.projectId,
        briefId: brief.id,
        prdDocumentId: prdDocId,
        prdVersion: finalDoc.version,
        generatedBy,
      },
      'module-6-briefforge-prd',
    )
  }

  private static async buildContext(
    brief: Brief & { sessions: Array<BriefSession & { questions: BriefQuestion[] }> },
  ): Promise<PRDGenerationContext> {
    // Busca nome do projeto via prisma (lazy import para evitar circular)
    const { prisma } = await import('@/lib/db')
    const project = await prisma.project.findUnique({
      where: { id: brief.projectId },
      select: { name: true, description: true },
    })

    // Encontra a última sessão COMPLETED
    const completedSession = brief.sessions
      .filter((s) => s.status === 'COMPLETED')
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]

    if (!completedSession) {
      throw new Error('Nenhuma sessão COMPLETED encontrada no brief')
    }

    const briefQA = (completedSession.questions ?? [])
      .filter((q) => q.answerText !== null)
      .sort((a, b) => a.order - b.order)
      .map((q) => ({ question: q.questionText, answer: q.answerText! }))

    return {
      projectName: project?.name ?? 'Projeto sem nome',
      projectDescription: project?.description ?? '',
      briefQA,
    }
  }

  private static buildUserMessage(context: PRDGenerationContext): string {
    const qaFormatted = context.briefQA
      .map((qa, i) => `**Pergunta ${i + 1}:** ${qa.question}\n**Resposta:** ${qa.answer}`)
      .join('\n\n')

    return [
      `# Briefing do Projeto: ${context.projectName}`,
      context.projectDescription ? `**Descrição:** ${context.projectDescription}` : '',
      '',
      '## Respostas da Entrevista',
      qaFormatted,
      '',
      'Com base nessas informações, gere o PRD completo.',
    ]
      .filter((line) => line !== undefined)
      .join('\n')
  }
}
