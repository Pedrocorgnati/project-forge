'use client'

// src/components/approvals/ApprovalResponseForm.tsx
// module-17-clientportal-approvals / TASK-7 ST002
// Formulario completo de resposta a aprovacao (cliente)
// Rastreabilidade: INT-107

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, FileText, CheckSquare, Package } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { SLACountdownBadge } from '@/components/approvals/SlaCountdownBadge'
import { ROUTES } from '@/lib/constants/routes'

const TYPE_CONFIG: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  DOCUMENT: { icon: FileText, label: 'Documento', color: 'text-blue-600 bg-blue-50' },
  MILESTONE: { icon: CheckSquare, label: 'Marco', color: 'text-green-600 bg-green-50' },
  DELIVERABLE: { icon: Package, label: 'Entrega', color: 'text-purple-600 bg-purple-50' },
}

interface ApprovalResponseFormProps {
  approvalId: string
  title: string
  description: string
  type: string
  projectName: string
  requesterName: string
  slaDeadline: string | Date
}

export function ApprovalResponseForm({
  approvalId,
  title,
  description,
  type,
  projectName,
  requesterName,
  slaDeadline,
}: ApprovalResponseFormProps) {
  const router = useRouter()
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState<'APPROVE' | 'REJECT' | null>(null)

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.DOCUMENT
  const Icon = config.icon
  const charCount = comment.length
  const MAX_CHARS = 2000

  const handleSubmit = useCallback(
    async (action: 'APPROVE' | 'REJECT') => {
      if (action === 'REJECT' && comment.trim().length === 0) {
        toast.error('Comentário obrigatório ao rejeitar uma aprovação.')
        return
      }

      setLoading(action)

      try {
        const res = await fetch(`/api/portal/approvals/${approvalId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            comment: comment.trim() || null,
          }),
        })

        if (res.status === 410) {
          toast.error('Esta aprovação expirou. O prazo de resposta já passou.')
          router.push(ROUTES.PORTAL_APPROVALS_LIST)
          return
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.message ?? 'Erro ao enviar resposta')
        }

        toast.success(
          action === 'APPROVE'
            ? 'Aprovacao registrada com sucesso!'
            : 'Rejeicao registrada com sucesso.'
        )
        router.push(ROUTES.PORTAL_APPROVALS_LIST)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
      } finally {
        setLoading(null)
      }
    },
    [approvalId, comment, router]
  )

  const isDisabled = loading !== null

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href={ROUTES.PORTAL_APPROVALS_LIST}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para aprovacoes
      </Link>

      {/* Approval details card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-md', config.color)}>
                <Icon className="w-4 h-4" />
              </span>
              <Badge variant="neutral">{config.label}</Badge>
            </div>
            <SLACountdownBadge
              slaDeadline={new Date(slaDeadline)}
              status="PENDING"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{projectName}</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-0.5">
              {title}
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
            {description}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Solicitado por {requesterName}
          </p>
        </CardContent>
      </Card>

      {/* Response card */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Sua resposta
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label
              htmlFor="approval-comment"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Comentário (obrigatório ao rejeitar)
            </label>
            <Textarea
              id="approval-comment"
              placeholder="Escreva seu comentário sobre esta aprovação..."
              value={comment}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setComment(e.target.value)
                }
              }}
              maxLength={MAX_CHARS}
              rows={4}
              disabled={isDisabled}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {charCount}/{MAX_CHARS}
            </p>
          </div>
        </CardContent>
        <CardFooter className="gap-3">
          <Button
            variant="destructive"
            size="md"
            disabled={isDisabled}
            loading={loading === 'REJECT'}
            icon={loading !== 'REJECT' ? <XCircle className="w-full h-full" /> : undefined}
            onClick={() => handleSubmit('REJECT')}
          >
            Rejeitar
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={isDisabled}
            loading={loading === 'APPROVE'}
            icon={loading !== 'APPROVE' ? <CheckCircle className="w-full h-full" /> : undefined}
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleSubmit('APPROVE')}
          >
            Aprovar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
