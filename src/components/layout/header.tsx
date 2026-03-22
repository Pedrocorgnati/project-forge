'use client'

import Link from 'next/link'
import { ChevronDown, LogOut, Menu, Settings, User, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { NotificationBell } from './notification-bell'
import { ROUTES } from '@/lib/constants'

interface HeaderProps {
  userName?: string
  userEmail?: string
  userAvatar?: string
  onMenuToggle?: () => void
  isMobileMenuOpen?: boolean
}

export function Header({
  userName = 'Usuário',
  userEmail,
  userAvatar,
  onMenuToggle,
  isMobileMenuOpen = false,
}: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [aiStatus] = useState<'available' | 'unavailable'>('available')

  return (
    <header
      data-testid="header"
      className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 z-40"
      aria-label="Cabeçalho da aplicação"
    >
      {/* Skip navigation */}
      <a href="#main-content" className="skip-nav">
        Pular para o conteúdo principal
      </a>

      {/* Left: Hamburger (mobile) + Logo */}
      <div data-testid="header-left" className="flex items-center gap-2">
        <button
          data-testid="header-mobile-menu-button"
          aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isMobileMenuOpen}
          onClick={onMenuToggle}
          className={cn(
            'md:hidden p-2 rounded-md transition-colors duration-150',
            'hover:bg-slate-100 dark:hover:bg-slate-800',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          )}
        >
          {isMobileMenuOpen
            ? <X size={20} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />
            : <Menu size={20} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />
          }
        </button>

        <Link
          data-testid="header-logo"
          href={ROUTES.DASHBOARD}
          aria-label="ProjectForge — página inicial"
          className="text-xl font-bold text-slate-900 dark:text-slate-50 hover:text-brand transition-colors"
        >
          {/* @ASSET_PLACEHOLDER
name: logo-symbol
type: image
extension: svg
format: 1:1
dimensions: 32x32
description: Logo símbolo do ProjectForge em formato vetorial. Forma geométrica abstrata representando fluxo de trabalho e integração de módulos.
context: Header da aplicação, sidebar colapsada
style: Minimalista, linhas finas, monocromático
mood: Profissional, moderno, confiável
colors: primary (#6366f1), background (#ffffff)
elements: Forma geométrica abstrata com iniciais PF estilizadas
avoid: Gradientes, sombras complexas, texto descritivo
*/}
          ProjectForge
        </Link>

        {/* AI Status indicator */}
        <div
          data-testid="header-ai-status"
          aria-label={aiStatus === 'available' ? 'IA disponível' : 'IA indisponível'}
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            aiStatus === 'available'
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning'
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              aiStatus === 'available' ? 'bg-success' : 'bg-warning'
            )}
            aria-hidden="true"
          />
          AI {aiStatus === 'available' ? '●' : '○'}
        </div>
      </div>

      {/* Right: Actions */}
      <div data-testid="header-actions" className="flex items-center gap-2">
        <NotificationBell />

        {/* User Menu */}
        <div data-testid="header-user-menu" className="relative">
          <button
            data-testid="header-user-menu-button"
            aria-label="Menu do usuário"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors duration-150',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              userMenuOpen && 'bg-slate-100 dark:bg-slate-800'
            )}
          >
            <Avatar src={userAvatar} name={userName} size="sm" decorative />
            <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
              {userName}
            </span>
            <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                aria-hidden="true"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                data-testid="header-user-menu-dropdown"
                className={cn(
                  'absolute right-0 top-10 z-50 w-48 rounded-lg border shadow-lg',
                  'bg-white dark:bg-slate-900',
                  'border-slate-200 dark:border-slate-700',
                  'py-1'
                )}
                role="menu"
                aria-label="Opções do usuário"
              >
                {userEmail && (
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userEmail}</p>
                  </div>
                )}
                <Link
                  data-testid="header-user-menu-item-perfil"
                  href={ROUTES.PROFILE}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={16} aria-hidden="true" />
                  Perfil
                </Link>
                <Link
                  data-testid="header-user-menu-item-configuracoes"
                  href={ROUTES.SETTINGS}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings size={16} aria-hidden="true" />
                  Configurações
                </Link>
                <div className="border-t border-slate-100 dark:border-slate-800 mt-1 pt-1">
                  <button
                    data-testid="header-user-menu-item-sair"
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                    onClick={() => {
                      setUserMenuOpen(false)
                      // TODO: Implementar backend - signOut
                    }}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
