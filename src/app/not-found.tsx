import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/constants/routes'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl font-bold text-brand dark:text-brand">404</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Página não encontrada
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href={ROUTES.DASHBOARD}>
          <Button variant="primary">Voltar ao Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
