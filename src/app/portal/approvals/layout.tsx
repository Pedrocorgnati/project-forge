// src/app/portal/approvals/layout.tsx
// module-17-clientportal-approvals / TASK-7 ST005
// Layout autenticado das aprovacoes do portal do cliente (role CLIENTE apenas)
// Rastreabilidade: INT-107

import { getServerUser } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { PortalHeader } from '@/components/portal/portal-header'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

export default async function PortalApprovalsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (user.role !== UserRole.CLIENTE) redirect(ROUTES.DASHBOARD)

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader userName={user.name ?? user.email} />
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-4xl py-8 px-4 focus:outline-none">
        {children}
      </main>
    </div>
  )
}
