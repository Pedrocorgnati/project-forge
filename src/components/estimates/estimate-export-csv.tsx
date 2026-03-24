'use client'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Download } from 'lucide-react'
import { exportEstimateCsv } from '@/lib/export/estimate-csv'

import type { EstimateItemProps } from '@/types/estimate-ui'

interface EstimateExportCsvProps {
  items: EstimateItemProps[]
  projectName: string
  version: number
}

export function EstimateExportCsv({ items, projectName, version }: EstimateExportCsvProps) {
  const handleExport = () => {
    try {
      exportEstimateCsv(items, { projectName, version })
      toast.success('CSV exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar CSV. Tente novamente.')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      icon={<Download className="h-4 w-4" />}
    >
      Exportar CSV
    </Button>
  )
}
