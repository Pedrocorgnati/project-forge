import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { EmbeddingService } from '@/lib/rag/embedding-service'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'
import { DegradedBanner } from '@/components/ui/degraded-banner'
import { HandoffContent } from './HandoffContent'
import {
  IndexingStatusCardSkeleton,
  DocumentsListSkeleton,
  GitHubSyncConfigSkeleton,
} from './_components/Skeletons'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'HandoffAI — Indexacao',
    description: 'Indexe documentos do projeto para habilitar respostas contextuais com IA',
  }
}

export default async function HandoffPage({ params }: Props) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  // CLIENTE nao acessa esta pagina
  if (user.role === UserRole.CLIENTE) redirect(ROUTES.PORTAL)

  await withProjectAccess(user.id, id, UserRole.DEV)

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!project) notFound()

  const [ragIndex, gitHubSync, isEmbeddingAvailable] = await Promise.all([
    prisma.rAGIndex.findUnique({
      where: { projectId: id },
      include: {
        ragDocuments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            sourceType: true,
            sourcePath: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.gitHubSync.findUnique({ where: { projectId: id } }),
    EmbeddingService.isAvailable().catch(() => false),
  ])

  // Preparar dados serializaveis para os client components
  const ragIndexData = ragIndex
    ? {
        id: ragIndex.id,
        projectId: ragIndex.projectId,
        indexationStatus: ragIndex.indexationStatus as 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED',
        totalChunks: ragIndex.totalChunks,
        lastIndexedAt: ragIndex.lastIndexedAt?.toISOString() ?? null,
        githubRepoUrl: ragIndex.githubRepoUrl,
        createdAt: ragIndex.createdAt.toISOString(),
      }
    : null

  const documentsData = (ragIndex?.ragDocuments ?? []).map((doc: { id: string; sourceType: string; sourcePath: string; createdAt: Date }) => ({
    id: doc.id,
    sourceType: doc.sourceType,
    sourcePath: doc.sourcePath,
    createdAt: doc.createdAt.toISOString(),
  }))

  const gitHubSyncData = gitHubSync
    ? {
        id: gitHubSync.id,
        installationId: gitHubSync.installationId,
        repoOwner: gitHubSync.repoOwner,
        repoName: gitHubSync.repoName,
        syncStatus: gitHubSync.syncStatus,
        lastWebhookAt: gitHubSync.lastWebhookAt?.toISOString() ?? null,
      }
    : null

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">HandoffAI</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Indexe os documentos do projeto para habilitar respostas contextuais do assistente de IA.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Projeto: {project.name}
        </p>
      </div>

      <DegradedBanner module="HANDOFFAI" isAvailable={isEmbeddingAvailable} />

      <Suspense
        fallback={
          <div className="space-y-6">
            <IndexingStatusCardSkeleton />
            <DocumentsListSkeleton />
            <GitHubSyncConfigSkeleton />
          </div>
        }
      >
        <HandoffContent
          ragIndex={ragIndexData}
          documents={documentsData}
          gitHubSync={gitHubSyncData}
          isAvailable={isEmbeddingAvailable}
          projectId={id}
        />
      </Suspense>
    </div>
  )
}
