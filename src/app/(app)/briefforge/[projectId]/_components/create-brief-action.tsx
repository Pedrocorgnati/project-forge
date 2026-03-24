'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { createBriefForProject } from '@/actions/briefforge'
import { toast } from '@/components/ui/toast'

interface CreateBriefActionProps {
  projectId: string
}

export function CreateBriefAction({ projectId }: CreateBriefActionProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    try {
      const result = await createBriefForProject(projectId)
      if ('error' in result && typeof result.error === 'string') {
        toast.error(result.error)
        return
      }
      router.refresh()
    } catch {
      toast.error('Erro inesperado ao criar briefing.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <EmptyState
      icon={<MessageSquare size={32} />}
      title="Iniciar Briefing"
      description="Responda às perguntas da IA para definir o escopo do projeto."
      action={{
        label: creating ? 'Criando...' : 'Iniciar Entrevista',
        onClick: handleCreate,
      }}
    />
  )
}
