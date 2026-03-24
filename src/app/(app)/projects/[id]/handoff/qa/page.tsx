import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'
import { SemanticSearchService } from '@/lib/rag/semantic-search-service'
import { EmbeddingService } from '@/lib/rag/embedding-service'
import { EmptyState } from '@/components/ui/empty-state'
import { DegradedBanner } from '@/components/ui/degraded-banner'
import { QueryInput } from './_components/QueryInput'
import { QueryHistory } from './_components/QueryHistory'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'HandoffAI — Q&A',
    description: 'Faça perguntas sobre o projeto e receba respostas contextuais com IA',
  }
}

export default async function HandoffQAPage({ params }: Props) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  if (user.role === UserRole.CLIENTE) redirect(ROUTES.PORTAL)

  await withProjectAccess(user.id, id, UserRole.DEV)

  const [hasIndex, isEmbeddingAvailable] = await Promise.all([
    SemanticSearchService.hasIndex(id),
    EmbeddingService.isAvailable().catch(() => false),
  ])

  // Se nao esta indexado, mostra empty state
  if (!hasIndex) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link
          href={ROUTES.PROJECT_HANDOFF(id)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Indexação
        </Link>
        <EmptyState
          title="Projeto ainda não indexado"
          description="Indexe os documentos do projeto antes de usar o Q&A. Volte para a página de indexação para iniciar."
          icon={<MessageSquare className="w-full h-full" />}
        />
      </div>
    )
  }

  // Carregar historico de queries via ragIndex
  const ragIndex = await prisma.rAGIndex.findUnique({
    where: { projectId: id },
    select: { id: true },
  })

  const queries = ragIndex
    ? await prisma.rAGQuery.findMany({
        where: { ragIndexId: ragIndex.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          query: true,
          answer: true,
          sources: true,
          createdAt: true,
        },
        take: 50,
      })
    : []

  const serializedQueries = queries.map((q: { id: string; query: string; answer: string | null; sources: unknown; createdAt: Date }) => ({
    id: q.id,
    query: q.query,
    answer: q.answer,
    sources: q.sources as Array<{ documentTitle?: string; excerpt?: string }>,
    createdAt: q.createdAt.toISOString(),
  }))

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link
        href={ROUTES.PROJECT_HANDOFF(id)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Indexacao
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          HandoffAI — Q&A
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Faca perguntas sobre o projeto e receba respostas baseadas na documentacao indexada.
        </p>
      </div>

      <DegradedBanner module="HANDOFFAI" isAvailable={isEmbeddingAvailable} />

      <div className="mt-6 space-y-6">
        <QueryInput projectId={id} aiAvailable={isEmbeddingAvailable} />
        {serializedQueries.length > 0 && (
          <QueryHistory queries={serializedQueries} />
        )}
      </div>
    </div>
  )
}
