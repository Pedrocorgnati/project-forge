import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import type { Metadata } from 'next'
import { getServerUser } from '@/lib/auth/get-user'
import { withProjectAccess } from '@/lib/rbac'
import { BriefService } from '@/lib/briefforge/brief-service'
import { DocumentService } from '@/lib/briefforge/document-service'
import { BriefStatus, PRDStatus } from '@/types/briefforge'
import { EmptyState } from '@/components/ui/empty-state'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { ROUTES } from '@/lib/constants/routes'
import { PRDGeneratingView } from './_components/prd-generating-view'
import { PRDDocumentViewer } from './_components/prd-document-viewer'
import { PRDGenerateAction } from './_components/prd-generate-action'
import './print.css'
import './prd-markdown.css'

export async function generateMetadata({
  params,
}: {
  params: { projectId: string }
}): Promise<Metadata> {
  return {
    title: `PRD - Projeto ${params.projectId}`,
    description: 'Documento de Requisitos do Produto gerado por IA',
  }
}

interface PageProps {
  params: { projectId: string }
}

export default async function PRDPage({ params }: PageProps) {
  const { projectId } = params

  const user = await getServerUser()
  if (!user) redirect(ROUTES.LOGIN)

  await withProjectAccess(user.id, projectId)

  const brief = await BriefService.findByProjectId(projectId, {
    includeLastSession: true,
  })

  // ── Brief nao existe ou nao esta COMPLETED → redirecionar ────────────────
  if (!brief || brief.status !== BriefStatus.COMPLETED) {
    redirect(ROUTES.BRIEFFORGE_SESSION(projectId))
  }

  // ── Buscar PRD mais recente ──────────────────────────────────────────────
  const latestPRD = await DocumentService.findLatest(brief.id)

  // ── Sem PRD: EmptyState diferenciado por role ────────────────────────────
  if (!latestPRD) {
    return (
      <div data-testid="prd-empty" className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            PRD
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Documento de Requisitos do Produto
          </p>
        </div>

        <PermissionGate
          role={['SOCIO', 'PM']}
          fallback={
            <EmptyState
              icon={<FileText size={32} />}
              title="PRD ainda não gerado"
              description="O PRD deste projeto ainda não foi gerado. Aguarde o gerente de projeto iniciar a geração."
            />
          }
        >
          <PRDGenerateAction briefId={brief.id} projectId={projectId} />
        </PermissionGate>
      </div>
    )
  }

  // ── PRD em geracao ───────────────────────────────────────────────────────
  if (latestPRD.status === PRDStatus.GENERATING) {
    return (
      <div data-testid="prd-generating" className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            PRD
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerando documento...
          </p>
        </div>
        <PRDGeneratingView briefId={brief.id} projectId={projectId} />
      </div>
    )
  }

  // ── PRD com erro ─────────────────────────────────────────────────────────
  if (latestPRD.status === PRDStatus.ERROR) {
    return (
      <div data-testid="prd-error" className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            PRD
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Erro na geração
          </p>
        </div>

        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 rounded-lg border px-4 py-3 bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-5">
              Erro ao gerar o PRD
            </p>
            <p className="text-sm leading-5 mt-0.5">
              Ocorreu um erro durante a geração do documento. Tente novamente.
            </p>
          </div>
        </div>

        <PermissionGate role={['SOCIO', 'PM']}>
          <PRDGenerateAction briefId={brief.id} projectId={projectId} />
        </PermissionGate>
      </div>
    )
  }

  // ── PRD READY ────────────────────────────────────────────────────────────
  return (
    <div data-testid="prd-ready" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          PRD
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Documento de Requisitos do Produto
        </p>
      </div>
      <PRDDocumentViewer
        prdDocument={latestPRD}
        briefId={brief.id}
        projectId={projectId}
      />
    </div>
  )
}
