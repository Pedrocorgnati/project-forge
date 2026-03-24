import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { ROUTES } from '@/lib/constants/routes'

/**
 * Card exibido quando o convite é inválido, expirado ou já utilizado.
 * Não expõe detalhes técnicos — apenas mensagem amigável.
 */
export function InviteExpiredCard() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Convite inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este convite expirou ou já foi utilizado. Solicite um novo convite ao administrador
            da sua organização.
          </p>
        </div>
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  )
}
