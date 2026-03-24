'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { FileText, Loader2 } from 'lucide-react'
import { exportEstimatePdf } from '@/lib/export/estimate-pdf'

interface EstimateExportPdfProps {
  estimateId: string
  projectName: string
}

export function EstimateExportPdf({ estimateId, projectName }: EstimateExportPdfProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await exportEstimatePdf(estimateId, projectName)
      toast.success('PDF exportado com sucesso')
    } catch {
      toast.error('Erro ao exportar PDF. Tente novamente.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      icon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
    >
      {isExporting ? 'Exportando…' : 'Exportar PDF'}
    </Button>
  )
}
