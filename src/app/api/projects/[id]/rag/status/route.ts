import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const log = createLogger('api/rag/status')

// ─── GET /api/projects/[id]/rag/status ──────────────────────────────────────
// Retorna status atual do RAGIndex + documentos + GitHubSync

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: projectId } = await params
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_001', message: 'Não autenticado.' } },
      { status: 401 },
    )
  }

  try {
    await withProjectAccess(user.id, projectId, UserRole.DEV)

    const [ragIndex, gitHubSync] = await Promise.all([
      prisma.rAGIndex.findUnique({
        where: { projectId },
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
      prisma.gitHubSync.findUnique({ where: { projectId } }),
    ])

    if (!ragIndex) {
      return NextResponse.json(
        { data: { ragIndex: null, documents: [], gitHubSync: null } },
        { status: 200 },
      )
    }

    return NextResponse.json({
      data: {
        ragIndex: {
          id: ragIndex.id,
          projectId: ragIndex.projectId,
          indexationStatus: ragIndex.indexationStatus,
          totalChunks: ragIndex.totalChunks,
          lastIndexedAt: ragIndex.lastIndexedAt,
          githubRepoUrl: ragIndex.githubRepoUrl,
          createdAt: ragIndex.createdAt,
        },
        documents: ragIndex.ragDocuments,
        gitHubSync,
      },
    })
  } catch (err) {
    log.error({ err }, '[RAG Status] Error:')
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: { code: 'SYS_001', message } }, { status: 500 })
  }
}
