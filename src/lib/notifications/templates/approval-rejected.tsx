import { Button, Heading, Text } from '@react-email/components'
import { BaseEmail } from './base'

// ─── APPROVAL REJECTED EMAIL ──────────────────────────────────────────────────

interface ApprovalRejectedEmailProps {
  projectName: string
  documentTitle: string
  rejectedBy: string
  reason?: string
  projectUrl: string
}

export function ApprovalRejectedEmail({
  projectName,
  documentTitle,
  rejectedBy,
  reason,
  projectUrl,
}: ApprovalRejectedEmailProps) {
  return (
    <BaseEmail previewText={`Ajustes solicitados — ${documentTitle}`}>
      <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
        Ajustes solicitados
      </Heading>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 12px' }}>
        <strong>{rejectedBy}</strong> solicitou ajustes no documento{' '}
        <strong>{documentTitle}</strong> do projeto <strong>{projectName}</strong>.
      </Text>
      {reason && (
        <Text
          style={{
            color: '#374151',
            fontSize: '14px',
            lineHeight: '20px',
            margin: '0 0 12px',
            backgroundColor: '#F9FAFB',
            padding: '12px',
            borderRadius: '6px',
            borderLeft: '3px solid #D1D5DB',
          }}
        >
          <strong>Motivo:</strong> {reason}
        </Text>
      )}
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 24px' }}>
        Revise o feedback e faça os ajustes necessários para reenviar.
      </Text>
      <Button
        href={projectUrl}
        style={{
          backgroundColor: '#0F1117',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Ver Detalhes
      </Button>
    </BaseEmail>
  )
}
