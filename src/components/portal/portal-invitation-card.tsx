// src/components/portal/portal-invitation-card.tsx
// module-16-clientportal-auth / TASK-3 ST002 (correção pós-auditoria)
// Card de convite com dados do projeto e botão para iniciar registro
// Rastreabilidade: INT-104, GAP-002

'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, User, Mail } from 'lucide-react'
import { ClientRegistrationFlow } from './client-registration-flow'

interface PortalInvitationCardProps {
  token: string
  projectName: string
  inviterName: string
  clientEmail: string
}

export function PortalInvitationCard({
  token, projectName, inviterName, clientEmail,
}: PortalInvitationCardProps) {
  const [showRegistration, setShowRegistration] = useState(false)

  if (showRegistration) {
    return <ClientRegistrationFlow token={token} clientEmail={clientEmail} projectName={projectName} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-blue-600" />
          </div>
          <Badge variant="info" className="mx-auto mb-2 w-fit">Convite para Portal</Badge>
          <h2 className="text-xl font-semibold">Você foi convidado!</h2>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FolderOpen className="h-4 w-4 text-gray-500 shrink-0" />
              <span className="text-gray-600">Projeto:</span>
              <span className="font-medium text-gray-900 truncate">{projectName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-500 shrink-0" />
              <span className="text-gray-600">Convidado por:</span>
              <span className="font-medium text-gray-900">{inviterName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-500 shrink-0" />
              <span className="text-gray-600">Seu email:</span>
              <span className="font-medium text-gray-900">{clientEmail}</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center">
            Ao aceitar, você criará uma conta para acompanhar documentos, estimativas e aprovações do projeto.
          </p>
        </CardContent>

        <CardFooter>
          <Button className="w-full" size="lg" onClick={() => setShowRegistration(true)}>
            Aceitar Convite
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
