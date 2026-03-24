import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autenticação — ProjectForge',
  description: 'Faça login ou configure sua conta no ProjectForge.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <main id="main-content" tabIndex={-1} className="w-full max-w-md focus:outline-none">
        {children}
      </main>
    </div>
  )
}
