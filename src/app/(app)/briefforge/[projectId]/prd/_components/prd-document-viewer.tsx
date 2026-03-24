'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Printer, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { API } from '@/lib/constants/api-routes'
import type { PRDDocument } from '@/types/briefforge'
import { formatDateTime } from '@/lib/utils/format'
import { PRDVersionHistory } from './prd-version-history'

interface PRDDocumentViewerProps {
  prdDocument: PRDDocument
  briefId: string
  projectId: string
}

export function PRDDocumentViewer({
  prdDocument,
  briefId,
  projectId,
}: PRDDocumentViewerProps) {
  const router = useRouter()
  const [generatingNew, setGeneratingNew] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleExportMarkdown() {
    const blob = new Blob([prdDocument.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PRD-v${prdDocument.version}-${projectId}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleExportPDF() {
    window.print()
  }

  async function handleGenerateNewVersion() {
    setGeneratingNew(true)
    setError(null)

    try {
      const res = await fetch(API.BRIEF_PRD(briefId), {
        method: 'POST',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Erro ao iniciar nova versao')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setGeneratingNew(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header com metadata e acoes */}
      <Card variant="default">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Documento de Requisitos do Produto
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="success" dot>
                  Versao {prdDocument.version}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Gerado em {formatDateTime(prdDocument.createdAt)}
                </span>
              </div>
            </div>

            {/* Acoes — apenas PM/SOCIO */}
            <PermissionGate role={['SOCIO', 'PM']}>
              <div
                className="prd-actions flex flex-wrap items-center gap-2"
                data-print-hide
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportMarkdown}
                  data-testid="prd-export-md"
                >
                  <Download size={14} aria-hidden="true" />
                  Exportar MD
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  data-testid="prd-export-pdf"
                >
                  <Printer size={14} aria-hidden="true" />
                  Exportar PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={generatingNew}
                  disabled={generatingNew}
                  onClick={handleGenerateNewVersion}
                  data-testid="prd-new-version"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Nova versao
                </Button>
              </div>
            </PermissionGate>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-600 dark:text-red-400 mt-2"
            >
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historico de versoes — apenas PM/SOCIO */}
      <PermissionGate role={['SOCIO', 'PM']}>
        <div data-print-hide className="prd-version-history">
          <PRDVersionHistory
            briefId={briefId}
            currentVersion={prdDocument.version}
          />
        </div>
      </PermissionGate>

      {/* Conteudo do PRD em Markdown */}
      <Card variant="default">
        <CardContent className="p-6 prd-content">
          <article
            data-testid="prd-markdown-content"
            className="prd-markdown-content"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {prdDocument.content}
            </ReactMarkdown>
          </article>
        </CardContent>
      </Card>
    </div>
  )
}
