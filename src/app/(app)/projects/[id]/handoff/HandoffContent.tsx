'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants/routes'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IndexingStatusCard } from './_components/IndexingStatusCard'
import { DocumentsList } from './_components/DocumentsList'
import { GitHubSyncConfig } from './_components/GitHubSyncConfig'

interface RagIndexData {
  id: string
  projectId: string
  indexationStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED'
  totalChunks: number
  lastIndexedAt: string | null
  githubRepoUrl: string | null
  createdAt: string
}

interface DocumentData {
  id: string
  sourceType: string
  sourcePath: string
  createdAt: string
}

interface GitHubSyncData {
  id: string
  installationId: string
  repoOwner: string
  repoName: string
  syncStatus: string
  lastWebhookAt: string | null
}

interface HandoffContentProps {
  ragIndex: RagIndexData | null
  documents: DocumentData[]
  gitHubSync: GitHubSyncData | null
  isAvailable: boolean
  projectId: string
}

export function HandoffContent({
  ragIndex,
  documents: initialDocuments,
  gitHubSync,
  isAvailable,
  projectId,
}: HandoffContentProps) {
  const [documents, setDocuments] = useState<DocumentData[]>(initialDocuments)

  const handleDataUpdate = useCallback(
    (_ragIndex: RagIndexData | null, newDocuments: DocumentData[]) => {
      if (newDocuments.length > 0) {
        setDocuments(newDocuments)
      }
    },
    [],
  )

  const isIndexed = ragIndex?.indexationStatus === 'COMPLETE'

  return (
    <div className="space-y-6">
      {isIndexed && (
        <div className="flex items-center justify-end">
          <Link href={ROUTES.PROJECT_HANDOFF_QA(projectId)}>
            <Button
              variant="outline"
              size="sm"
              icon={<MessageSquare className="w-4 h-4" />}
            >
              Abrir Q&A
            </Button>
          </Link>
        </div>
      )}
      <IndexingStatusCard
        initialRagIndex={ragIndex}
        isAvailable={isAvailable}
        projectId={projectId}
        onDataUpdate={handleDataUpdate}
      />
      <DocumentsList documents={documents} />
      <GitHubSyncConfig
        gitHubSync={gitHubSync}
        isAvailable={isAvailable}
        projectId={projectId}
      />
    </div>
  )
}
