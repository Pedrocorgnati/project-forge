// src/app/portal/[token]/page.tsx
// module-16-clientportal-auth / TASK-3 ST004 (correção pós-auditoria)
// Página pública que valida token e renderiza estado correto
// Rastreabilidade: INT-104, GAP-001

import { PortalInvitationCard } from '@/components/portal/portal-invitation-card'
import { InvalidInvitationPage } from '@/components/portal/invalid-invitation-page'

interface TokenPageProps {
  params: Promise<{ token: string }>
}

async function getInvitationData(token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${appUrl}/api/portal/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { code: 'UNKNOWN' } }))
    return { error: err.error?.code as string }
  }
  return { data: await res.json() }
}

export default async function PortalTokenPage({ params }: TokenPageProps) {
  const { token } = await params
  const { data, error } = await getInvitationData(token)

  if (error) {
    const messages: Record<string, string> = {
      APPROVAL_081: 'Este link de convite não existe.',
      APPROVAL_083: 'Este convite foi revogado. Entre em contato com a equipe.',
      APPROVAL_082: 'Este convite já foi utilizado. Acesse seu portal normalmente.',
      EXPIRED: 'Este convite expirou. Solicite um novo convite à equipe.',
    }
    return <InvalidInvitationPage reason={messages[error] ?? 'Link inválido.'} />
  }

  return (
    <PortalInvitationCard
      token={token}
      projectName={data.projectName}
      inviterName={data.inviterName}
      clientEmail={data.clientEmail}
    />
  )
}

export async function generateMetadata() {
  return { title: 'Convite para Portal do Cliente — ProjectForge' }
}
