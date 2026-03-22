import { Settings } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configurações' }

export default function SettingsPage() {
  return (
    <div data-testid="configuracoes-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Configurações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div data-testid="configuracoes-layout" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div data-testid="configuracoes-nav" className="md:col-span-1 space-y-1">
          {[
            { label: 'Perfil', active: true },
            { label: 'Segurança', active: false },
            { label: 'Notificações', active: false },
            { label: 'Integrações', active: false },
            { label: 'Workspace', active: false },
          ].map((item) => (
            <button
              key={item.label}
              data-testid={`configuracoes-nav-item-${item.label.toLowerCase()}`}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-brand-light text-brand dark:bg-brand/20 dark:text-brand'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div data-testid="configuracoes-content" className="md:col-span-2 space-y-4">
          <Card data-testid="configuracoes-perfil-card" variant="default">
            <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Perfil</h2>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                {/* @ASSET_PLACEHOLDER
name: settings-avatar-placeholder
type: image
extension: png
format: 1:1
dimensions: 64x64
description: Avatar placeholder para a página de configurações de perfil do usuário no ProjectForge.
context: Página de configurações, seção de perfil
style: Circular, minimalista
colors: slate (#94a3b8)
elements: Silhueta de pessoa genérica
avoid: Texto, cores vibrantes
*/}
                <div className="w-16 h-16 rounded-full bg-brand-light dark:bg-brand/20 flex items-center justify-center">
                  <Settings size={24} className="text-brand" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">Usuário</p>
                  <p className="text-sm text-slate-500">usuario@empresa.com</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configurações de perfil serão implementadas na integração com o backend.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
