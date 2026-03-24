// src/components/profitability/ExportButtons.tsx
// module-15-rentabilia-dashboard / TASK-8 / ST001
'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

interface ExportButtonsProps {
  projectId: string
  reportId?: string
}

export function ExportButtons({ projectId, reportId }: ExportButtonsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleExportPDF = async () => {
    if (!reportId) return
    try {
      const res = await fetch(`/api/projects/${projectId}/profit-reports/${reportId}/export`)
      if (!res.ok) throw new Error('Falha ao gerar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      toast.error('Não foi possível exportar o relatório PDF')
    } finally {
      setOpen(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/timesheet/export`)
      if (!res.ok) throw new Error('Falha ao gerar CSV')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'timesheet.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Não foi possível exportar o timesheet CSV')
    } finally {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Exportar
        <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md py-1"
        >
          <button
            role="menuitem"
            onClick={handleExportPDF}
            disabled={!reportId}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Relatório PDF
          </button>
          <button
            role="menuitem"
            onClick={handleExportCSV}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Timesheet CSV
          </button>
        </div>
      )}
    </div>
  )
}
