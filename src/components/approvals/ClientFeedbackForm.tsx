'use client'

// src/components/approvals/ClientFeedbackForm.tsx
// module-17-clientportal-approvals / TASK-7 ST003
// Formulario de feedback do cliente
// Rastreabilidade: INT-107

import { useState, useCallback } from 'react'
import { Textarea, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { API } from '@/lib/constants/api-routes'

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'Geral' },
  { value: 'APPROVAL', label: 'Aprovacao' },
  { value: 'CONCERN', label: 'Preocupacao' },
]

interface ClientFeedbackFormProps {
  projectId: string
}

export function ClientFeedbackForm({ projectId }: ClientFeedbackFormProps) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [loading, setLoading] = useState(false)

  const MAX_CHARS = 2000
  const MIN_CHARS = 5
  const charCount = content.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!isValid) {
        toast.error(`O feedback deve ter entre ${MIN_CHARS} e ${MAX_CHARS} caracteres.`)
        return
      }

      setLoading(true)

      try {
        const res = await fetch(API.PORTAL_FEEDBACK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            content: content.trim(),
            category,
          }),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? 'Erro ao enviar feedback')
        }

        toast.success('Feedback enviado com sucesso!')
        setContent('')
        setCategory('GENERAL')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
      } finally {
        setLoading(false)
      }
    },
    [content, category, projectId, isValid]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="feedback-content"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Seu feedback
        </label>
        <Textarea
          id="feedback-content"
          placeholder="Descreva seu feedback sobre o projeto..."
          value={content}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              setContent(e.target.value)
            }
          }}
          maxLength={MAX_CHARS}
          rows={4}
          disabled={loading}
        />
        <p className="text-xs text-slate-400 mt-1 text-right">
          {charCount}/{MAX_CHARS}
        </p>
      </div>

      <div>
        <label
          htmlFor="feedback-category"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Categoria
        </label>
        <Select
          id="feedback-category"
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={loading}
        disabled={!isValid || loading}
      >
        Enviar feedback
      </Button>
    </form>
  )
}
