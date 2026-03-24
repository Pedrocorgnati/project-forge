import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import type { Metadata } from 'next'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { BriefService } from '@/lib/briefforge/brief-service'
import { BriefStatus } from '@/types/briefforge'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { ROUTES } from '@/lib/constants/routes'
import { BriefSessionChat } from './_components/brief-session-chat'
import { BriefSummaryView } from './_components/brief-summary-view'
import { CreateBriefAction } from './_components/create-brief-action'
import { BriefforgeLoading } from './loading'

export async function generateMetadata({
  params,
}: {
  params: { projectId: string }
}): Promise<Metadata> {
  return {
    title: `BriefForge - Projeto ${params.projectId}`,
    description: 'Entrevista de briefing assistida por IA',
  }
}

interface PageProps {
  params: { projectId: string }
}

export default async function BriefForgeSessionPage({ params }: PageProps) {
  const { projectId } = params

  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  await withProjectAccess(user.id, projectId)

  const brief = await BriefService.findByProjectId(projectId, {
    includeLastSession: true,
  })

  // ── Brief não existe ──────────────────────────────────────────────────────
  if (!brief) {
    return (
      <div data-testid="briefforge-empty" className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            BriefForge
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Entrevista de briefing assistida por IA
          </p>
        </div>

        <PermissionGate
          role={['SOCIO', 'PM']}
          fallback={
            <EmptyState
              icon={<MessageSquare size={32} />}
              title="Nenhum briefing encontrado"
              description="O briefing deste projeto ainda não foi iniciado. Aguarde o gerente de projeto iniciar a entrevista."
            />
          }
        >
          <CreateBriefAction projectId={projectId} />
        </PermissionGate>
      </div>
    )
  }

  // ── Brief COMPLETED ───────────────────────────────────────────────────────
  if (brief.status === BriefStatus.COMPLETED) {
    return (
      <div data-testid="briefforge-summary" className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            BriefForge
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Briefing concluído
          </p>
        </div>
        <BriefSummaryView brief={brief} projectId={projectId} />
      </div>
    )
  }

  // ── Brief DRAFT ou IN_PROGRESS ────────────────────────────────────────────
  return (
    <div data-testid="briefforge-session-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          BriefForge
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Entrevista de briefing
        </p>
      </div>
      <Suspense fallback={<BriefforgeLoading />}>
        <BriefSessionChat
          brief={brief}
          projectId={projectId}
        />
      </Suspense>
    </div>
  )
}
