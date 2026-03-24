import { FileText, GitBranch, Upload, File, FolderOpen } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/utils/format'

interface DocumentItem {
  id: string
  sourceType: string
  sourcePath: string
  createdAt: string | Date
}

interface DocumentsListProps {
  documents: DocumentItem[]
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  github: <GitBranch className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />,
  docs: <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />,
  manual: <Upload className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />,
}

const SOURCE_LABELS: Record<string, string> = {
  github: 'GitHub',
  docs: 'Docs',
  manual: 'Manual',
}

export function DocumentsList({ documents }: DocumentsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Documentos Indexados
          </h2>
          {documents.length > 0 && (
            <Badge variant="neutral">{documents.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {documents.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} />}
            title="Nenhum documento indexado"
            description="Inicie a indexação para processar os documentos do projeto."
          />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-6 py-3"
              >
                {SOURCE_ICONS[doc.sourceType] ?? (
                  <File className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
                <span
                  className="flex-1 text-sm text-slate-900 dark:text-slate-100 truncate"
                  title={doc.sourcePath}
                >
                  {doc.sourcePath}
                </span>
                <Badge variant="neutral">
                  {SOURCE_LABELS[doc.sourceType] ?? doc.sourceType}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block tabular-nums">
                  {formatDate(doc.createdAt, { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
