import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/get-user'
import { UserRole } from '@prisma/client'
import { ROUTES } from '@/lib/constants/routes'

/**
 * Route Group: (dashboard)
 *
 * Responsabilidade: Guard RBAC server-side — sem layout visual próprio.
 * Redireciona CLIENTE para /portal/dashboard.
 * Não adiciona sidebar/header — o layout visual vem do group (app) acima.
 *
 * Use este group para rotas que devem ser inacessíveis para CLIENTE:
 * change-orders, profitability, scope-alerts.
 *
 * NOTA: /projects/[id]/profitability existe tanto em (app) quanto em (dashboard).
 * A versão em (dashboard) aplica o guard de CLIENTE; a versão em (app) não.
 * Consolidar em (dashboard) quando as rotas em (app) tiverem RBAC próprio.
 */
export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)
  if (user.role === UserRole.CLIENTE) redirect(ROUTES.PORTAL_CLIENT_DASHBOARD)

  return <>{children}</>
}
