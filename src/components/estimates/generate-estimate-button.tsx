'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'

interface GenerateEstimateButtonProps {
  projectId: string
  disabled?: boolean
}

export function GenerateEstimateButton({ projectId, disabled }: GenerateEstimateButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg =
          res.status === 422
            ? (data.error ?? 'Brief aprovado não encontrado.')
            : 'Erro ao iniciar estimativa. Tente novamente.'
        toast.error(errorMsg)
        return
      }

      toast.success('Estimativa iniciada', {
        description: 'A IA está gerando sua estimativa. Isso pode levar alguns segundos.',
      })
      router.refresh()
    } catch {
      toast.error('Falha na conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={disabled || isLoading}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Iniciando…
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Gerar Estimativa
        </>
      )}
    </Button>
  )
}
