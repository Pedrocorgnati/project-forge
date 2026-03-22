import { User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Perfil' }

export default function ProfilePage() {
  return (
    <div data-testid="perfil-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Perfil</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Suas informações pessoais e preferências
        </p>
      </div>

      <Card variant="default">
        <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Dados do perfil
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <EmptyState
            icon={<User size={32} />}
            title="Perfil em construção"
            description="Esta seção estará disponível após a implementação do backend."
          />
        </CardContent>
      </Card>
    </div>
  )
}
