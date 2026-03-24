// src/components/portal/client-invite-manager.tsx
// module-16-clientportal-auth / TASK-3 ST006 (correção pós-auditoria)
// Componente para SOCIO/PM gerenciar convites de clientes na área interna
// Rastreabilidade: INT-104, GAP-006

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { Trash2, Mail, RefreshCw } from 'lucide-react'

const InviteSchema = z.object({ clientEmail: z.string().email('Email inválido') })
type InviteForm = z.infer<typeof InviteSchema>

interface ClientAccessItem {
  id: string
  clientEmail: string
  status: 'PENDING' | 'ACTIVE' | 'REVOKED'
  invitedAt: string
  inviter: { name: string } | null
}

interface ClientInviteManagerProps {
  projectId: string
  initialAccesses: ClientAccessItem[]
}

export function ClientInviteManager({ projectId, initialAccesses }: ClientInviteManagerProps) {
  const [accesses, setAccesses] = useState(initialAccesses)
  const [isInviting, setIsInviting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(InviteSchema),
  })

  const handleInvite = async (data: InviteForm) => {
    setIsInviting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/client-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? 'Erro ao enviar convite')
      }
      const newAccess = await res.json()
      setAccesses((prev) => [newAccess, ...prev])
      reset()
      toast.success('Convite enviado!', { description: `Email enviado para ${data.clientEmail}` })
    } catch (err) {
      toast.error('Erro', { description: err instanceof Error ? err.message : 'Tente novamente' })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevoke = async (accessId: string, email: string) => {
    if (!window.confirm(`Revogar acesso de ${email}? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch(`/api/projects/${projectId}/client-access/${accessId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Erro ao revogar acesso')
      setAccesses((prev) =>
        prev.map((a) => (a.id === accessId ? { ...a, status: 'REVOKED' as const } : a)),
      )
      toast.success('Acesso revogado')
    } catch {
      toast.error('Erro ao revogar')
    }
  }

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendente',
    ACTIVE: 'Ativo',
    REVOKED: 'Revogado',
  }

  const statusVariant: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
    PENDING: 'warning',
    ACTIVE: 'success',
    REVOKED: 'error',
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Acesso do Cliente</h3>

      <form onSubmit={handleSubmit(handleInvite)} className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="client-email-invite" className="sr-only">Email do cliente</Label>
          <Input
            id="client-email-invite"
            {...register('clientEmail')}
            placeholder="email@empresa.com"
            type="email"
            disabled={isInviting}
          />
          {errors.clientEmail && (
            <p className="text-xs text-red-500 mt-1">{errors.clientEmail.message}</p>
          )}
        </div>
        <Button type="submit" size="sm" disabled={isInviting}>
          {isInviting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
          {isInviting ? '' : 'Convidar'}
        </Button>
      </form>

      {accesses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum cliente convidado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {accesses.map((access) => (
            <li key={access.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium text-gray-900">{access.clientEmail}</p>
                <p className="text-xs text-gray-400">Convidado por {access.inviter?.name ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[access.status] ?? 'neutral'}>{statusLabel[access.status] ?? access.status}</Badge>
                {access.status !== 'REVOKED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => handleRevoke(access.id, access.clientEmail)}
                    aria-label={`Revogar acesso de ${access.clientEmail}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
