import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { DevOverlayWrapper } from '@/components/dev/DevOverlayWrapper'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'ProjectForge',
    template: '%s | ProjectForge',
  },
  description: 'Plataforma PSA para software houses — gerencie projetos, equipes e rentabilidade.',
  icons: {
    // @ASSET_PLACEHOLDER
    // name: favicon
    // type: image
    // extension: ico
    // format: 1:1
    // dimensions: 32x32
    // description: Favicon do ProjectForge. Ícone geométrico minimalista com iniciais PF estilizadas.
    // context: Browser tab, bookmarks
    // style: Minimalista, monocromático
    // colors: primary (#6366f1)
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <Providers>{children}</Providers>
        <DevOverlayWrapper />
      </body>
    </html>
  )
}
