'use client'

// src/components/board/AssigneePicker.tsx
// Seletor de assignee com busca e RBAC (module-9-scopeshield-board)

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'

interface Member {
  id: string
  name: string | null
  avatarUrl: string | null
}

interface AssigneePickerProps {
  members: Member[]
  selectedId: string | null
  onChange: (id: string | null) => void
  userRole: string
  userId: string
}

export function AssigneePicker({
  members,
  selectedId,
  onChange,
  userRole,
  userId,
}: AssigneePickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const isDev = userRole === 'DEV'

  // DEV can only self-assign
  const availableMembers = useMemo(() => {
    if (isDev) return members.filter((m) => m.id === userId)
    return members
  }, [members, isDev, userId])

  const filtered = useMemo(() => {
    if (!search.trim()) return availableMembers
    const lower = search.toLowerCase()
    return availableMembers.filter((m) =>
      m.name?.toLowerCase().includes(lower),
    )
  }, [availableMembers, search])

  const selected = members.find((m) => m.id === selectedId)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left',
          'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800',
          'hover:border-slate-400 dark:hover:border-slate-500 transition-colors',
        )}
        aria-label="Selecionar responsável"
        aria-expanded={isOpen}
      >
        {selected ? (
          <>
            <Avatar src={selected.avatarUrl ?? undefined} name={selected.name ?? undefined} size="sm" decorative className="w-5 h-5 text-[9px]" />
            <span className="text-slate-700 dark:text-slate-300 truncate">{selected.name ?? 'Sem nome'}</span>
          </>
        ) : (
          <span className="text-slate-400">Selecionar...</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {!isDev && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
              <Input
                placeholder="Buscar membro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          {/* Remove assignee option */}
          <button
            type="button"
            onClick={() => { onChange(null); setIsOpen(false) }}
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Nenhum
          </button>

          {filtered.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => { onChange(member.id); setIsOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                'hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors',
                selectedId === member.id && 'bg-brand-light dark:bg-brand/20',
              )}
            >
              <Avatar src={member.avatarUrl ?? undefined} name={member.name ?? undefined} size="sm" decorative className="w-5 h-5 text-[9px]" />
              <span className="text-slate-700 dark:text-slate-300 truncate">{member.name ?? 'Sem nome'}</span>
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">Nenhum membro encontrado</p>
          )}
        </div>
      )}
    </div>
  )
}
