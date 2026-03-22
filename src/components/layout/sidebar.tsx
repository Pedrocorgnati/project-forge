'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import {
  Home,
  FolderOpen,
  FileText,
  BarChart2,
  Shield,
  Bot,
  TrendingUp,
  Users,
  LayoutGrid,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: Home },
  { label: 'Projetos', href: ROUTES.PROJECTS, icon: FolderOpen },
]

const moduleItems = [
  { label: 'BriefForge', href: ROUTES.BRIEFFORGE, icon: FileText },
  { label: 'EstimaAI', href: ROUTES.ESTIMAI, icon: BarChart2 },
  { label: 'ScopeShield', href: ROUTES.SCOPESHIELD, icon: Shield },
  { label: 'HandoffAI', href: ROUTES.HANDOFFAI, icon: Bot },
  { label: 'RentabilIA', href: ROUTES.RENTABILIA, icon: TrendingUp },
  { label: 'ClientPortal', href: ROUTES.PORTAL, icon: Users },
  { label: 'Board', href: ROUTES.BOARD, icon: LayoutGrid },
]

const bottomItems = [
  { label: 'Configurações', href: ROUTES.SETTINGS, icon: Settings },
]

interface NavItemProps {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

function NavItem({ label, href, icon: Icon }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')
  const slug = href.split('/').filter(Boolean).pop() ?? 'home'

  return (
    <Link
      data-testid={`sidebar-nav-item-${slug}`}
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        isActive
          ? 'bg-brand-light text-brand dark:bg-brand/20 dark:text-brand'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
      )}
    >
      <Icon size={20} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <aside
        data-testid="sidebar"
        className={cn(
          'fixed left-0 top-16 bottom-0 w-60 flex flex-col z-30 overflow-y-auto',
          'bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700',
          'transition-transform duration-200',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        aria-label="Navegação principal"
      >
        <nav data-testid="sidebar-nav" className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          <div data-testid="sidebar-modules-section" className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Módulos
            </p>
            {moduleItems.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>

        <div data-testid="sidebar-bottom" className="px-3 py-4 border-t border-slate-200 dark:border-slate-700 space-y-1">
          {bottomItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </aside>
    </>
  )
}
