// src/components/approvals/ExpiredApprovalPage.tsx
// module-17-clientportal-approvals / TASK-7 ST004
// Pagina de aprovacao expirada
// Rastreabilidade: INT-107

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/constants/routes'

interface ExpiredApprovalPageProps {
  approvalTitle: string
  projectName: string
  requesterEmail: string
}

export function ExpiredApprovalPage({
  approvalTitle,
  projectName,
  requesterEmail,
}: ExpiredApprovalPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="text-center space-y-4 py-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Esta aprovação expirou
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              O prazo de 72 horas para responder à aprovação &ldquo;{approvalTitle}&rdquo; do
              projeto {projectName} já passou.
            </p>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Entre em contato com{' '}
            <a
              href={`mailto:${requesterEmail}`}
              className="text-brand hover:underline"
            >
              {requesterEmail}
            </a>{' '}
            caso precise discutir esta aprovação.
          </p>

          <Link href={ROUTES.PORTAL_APPROVALS_LIST}>
            <Button variant="outline" size="md">
              Voltar para aprovações
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
