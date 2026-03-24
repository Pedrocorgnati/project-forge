import { Button, Heading, Text } from '@react-email/components'
import { BaseEmail } from './base'

// ─── APPROVAL APPROVED EMAIL ──────────────────────────────────────────────────

interface ApprovalApprovedEmailProps {
  projectName: string
  documentTitle: string
  approvedBy: string
  approvedAt: string // ISO string
  nextStepUrl: string
}

export function ApprovalApprovedEmail({
  projectName,
  documentTitle,
  approvedBy,
  approvedAt,
  nextStepUrl,
}: ApprovalApprovedEmailProps) {
  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(approvedAt))

  return (
    <BaseEmail previewText={`✅ ${documentTitle} aprovado`}>
      <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669', margin: '0 0 16px' }}>
        ✅ Documento aprovado!
      </Heading>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 12px' }}>
        O documento <strong>{documentTitle}</strong> do projeto <strong>{projectName}</strong> foi
        aprovado por <strong>{approvedBy}</strong> em {dateFormatted}.
      </Text>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 24px' }}>
        Você pode prosseguir com a próxima etapa do projeto.
      </Text>
      <Button
        href={nextStepUrl}
        style={{
          backgroundColor: '#059669',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Ver Documento Aprovado
      </Button>
    </BaseEmail>
  )
}
