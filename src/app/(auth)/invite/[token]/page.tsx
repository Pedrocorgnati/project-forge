import { prisma } from '@/lib/db'
import { InviteRegisterForm } from '@/components/auth/InviteRegisterForm'
import { InviteExpiredCard } from '@/components/auth/InviteExpiredCard'

interface Props {
  params: Promise<{ token: string }>
}

/**
 * Página de aceite de convite — Server Component.
 * Valida o token no banco antes de renderizar o formulário.
 */
export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    select: {
      email: true,
      role: true,
      usedAt: true,
      expiresAt: true,
    },
  })

  const isValid =
    invite &&
    invite.usedAt === null &&
    invite.expiresAt > new Date()

  if (!isValid) {
    return <InviteExpiredCard />
  }

  return (
    <InviteRegisterForm
      token={token}
      email={invite.email}
      role={invite.role}
    />
  )
}
