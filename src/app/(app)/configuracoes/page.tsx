'use client'

import { useState } from 'react'
import { Camera, Key, Bell, Plug, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { toast } from '@/components/ui/toast'
import { PerfilTab } from './_components/PerfilTab'
import { SegurancaTab } from './_components/SegurancaTab'
import { NotificacoesTab } from './_components/NotificacoesTab'

const NAV_ITEMS = [
  { id: 'perfil', label: 'Perfil', icon: Camera },
  { id: 'seguranca', label: 'Segurança', icon: Key },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'integracoes', label: 'Integrações', icon: Plug },
  { id: 'workspace', label: 'Workspace', icon: Building2 },
] as const

type TabId = typeof NAV_ITEMS[number]['id']

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('perfil')

  return (
    <div data-testid="configuracoes-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Configurações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div data-testid="configuracoes-layout" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <nav data-testid="configuracoes-nav" className="md:col-span-1 space-y-1" aria-label="Seções de configurações">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                data-testid={`configuracoes-nav-item-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeTab === item.id
                    ? 'bg-brand-light text-brand dark:bg-brand/20 dark:text-brand'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div data-testid="configuracoes-content" className="md:col-span-2 space-y-4">
          {activeTab === 'perfil' && <PerfilTab />}
          {activeTab === 'seguranca' && <SegurancaTab />}
          {activeTab === 'notificacoes' && <NotificacoesTab />}

          {activeTab === 'integracoes' && (
            <Card data-testid="configuracoes-integracoes-card" variant="default">
              <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Integrações</h2>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between py-3 border rounded-md px-4">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-900 dark:text-slate-50" fill="currentColor" aria-hidden="true">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">GitHub</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sincronizar repositórios</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.success('Redirecionando para o GitHub...')}>
                    Conectar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'workspace' && (
            <Card data-testid="configuracoes-workspace-card" variant="default">
              <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Workspace</h2>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField label="Nome da organização" htmlFor="ws-org-name">
                  <Input id="ws-org-name" placeholder="Nome da sua empresa" defaultValue="Minha Empresa" />
                </FormField>

                <FormField label="Moeda padrão" htmlFor="ws-currency">
                  <select
                    id="ws-currency"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <option value="BRL">BRL — Real Brasileiro</option>
                    <option value="USD">USD — Dólar Americano</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </FormField>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => toast.success('Configurações do workspace salvas!')}>
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
