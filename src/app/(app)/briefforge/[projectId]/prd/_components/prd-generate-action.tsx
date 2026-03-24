'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { API } from '@/lib/constants/api-routes'

interface PRDGenerateActionProps {
  briefId: string
  projectId: string
}

export function PRDGenerateAction({ briefId }: PRDGenerateActionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(API.BRIEF_PRD(briefId), {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Erro ao iniciar geração do PRD')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <EmptyState
        icon={<FileText size={32} />}
        title="PRD ainda não gerado"
        description="O briefing está concluído. Clique abaixo para gerar o PRD automaticamente."
      />

      {error && (
        <div
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 text-center"
        >
          {error}
        </div>
      )}

      <div className="flex justify-center">
        <Button
          variant="primary"
          size="md"
          loading={loading}
          disabled={loading}
          onClick={handleGenerate}
          data-testid="prd-generate-btn"
        >
          <FileText size={16} aria-hidden="true" />
          Gerar PRD
        </Button>
      </div>
    </div>
  )
}
