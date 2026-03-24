import type { Event } from '@prisma/client'
import { EventType } from '@/lib/constants/events'
import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import type { EventHandler } from '../types'

const log = createLogger('rag-handlers')

type RegisterFn = (type: string, handler: EventHandler) => void

/**
 * Handler RAG_INDEX_STARTED: auto-indexa Brief e Estimates do projeto.
 * Busca documentos de brief completado e estimates prontas, cria RAGDocuments.
 */
async function handleRAGIndexStarted(event: Event): Promise<void> {
  const projectId = event.projectId
  if (!projectId) return

  try {
    // Buscar RAGIndex do projeto
    const ragIndex = await prisma.rAGIndex.findUnique({ where: { projectId } })
    if (!ragIndex) return

    // Buscar Brief COMPLETED do projeto
    const brief = await prisma.brief.findFirst({
      where: { projectId, status: 'COMPLETED' },
      include: { sessions: { include: { questions: true } } },
    })

    if (brief) {
      const briefContent = brief.sessions
        .flatMap((s: { questions: Array<{ questionText: string; answerText?: string | null }> }) => s.questions)
        .filter((q: { questionText: string; answerText?: string | null }) => q.answerText)
        .map((q: { questionText: string; answerText?: string | null }) => `Q: ${q.questionText}\nA: ${q.answerText}`)
        .join('\n\n')

      if (briefContent.length > 0) {
        await prisma.rAGDocument.create({
          data: {
            ragIndexId: ragIndex.id,
            sourceType: 'docs',
            sourcePath: 'brief/project-brief',
            content: briefContent,
            metadata: { briefId: brief.id, source: 'auto-indexed' },
          },
        })
      }
    }

    // Buscar Estimates READY do projeto
    const estimates = await prisma.estimate.findMany({
      where: { projectId, status: 'READY' },
      include: { items: true },
    })

    for (const estimate of estimates) {
      const estimateContent = [
        `Estimate v${estimate.version} — ${estimate.confidence} confidence`,
        `Total: ${estimate.totalMin}h–${estimate.totalMax}h`,
        '',
        ...estimate.items.map(
          (item: { category: string; description: string; hoursMin: unknown; hoursMax: unknown }) => `${item.category}: ${item.description} (${item.hoursMin}–${item.hoursMax}h)`,
        ),
      ].join('\n')

      await prisma.rAGDocument.create({
        data: {
          ragIndexId: ragIndex.id,
          sourceType: 'docs',
          sourcePath: `estimates/v${estimate.version}`,
          content: estimateContent,
          metadata: { estimateId: estimate.id, version: estimate.version, source: 'auto-indexed' },
        },
      })
    }

    log.info(
      { projectId, briefs: brief ? 1 : 0, estimates: estimates.length },
      `[RAG] Auto-indexed ${brief ? 1 : 0} brief + ${estimates.length} estimates for project ${projectId}`,
    )
  } catch (err) {
    log.error({ projectId, err }, '[RAG] Auto-indexing failed')
    // Handler falha sem propagar exceção — EventBus não recebe exceção
  }
}

export function registerRAGHandlers(register: RegisterFn): void {
  register(EventType.RAG_INDEX_STARTED, handleRAGIndexStarted)
}
