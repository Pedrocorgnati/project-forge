// ─── TEAM MEMBER FILTER ─────────────────────────────────────────────────────
// module-14-rentabilia-timesheet / TASK-5
// Select para filtrar por membro da equipe (visível apenas para SOCIO/PM)

'use client'

import { Select } from '@/components/ui'

interface TeamMember {
  id: string
  name: string
}

interface TeamMemberFilterProps {
  members: TeamMember[]
  value: string
  onChange: (userId: string) => void
}

export function TeamMemberFilter({ members, value, onChange }: TeamMemberFilterProps) {
  const options = [
    { value: '', label: 'Toda a equipe' },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ]

  return (
    <div className="w-full max-w-[240px]">
      <Select
        options={options}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Filtrar por membro"
      />
    </div>
  )
}
