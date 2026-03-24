import { Button, Heading, Text, Section } from '@react-email/components'
import { BaseEmail } from './base'

// ─── APPROVAL REQUEST EMAIL ───────────────────────────────────────────────────

interface ApprovalRequestEmailProps {
  projectName: string
  documentTitle: string
  requestedBy: string
  slaDeadline: string // ISO string
  approvalUrl: string
}

export function ApprovalRequestEmail({
  projectName,
  documentTitle,
  requestedBy,
  slaDeadline,
  approvalUrl,
}: ApprovalRequestEmailProps) {
  const deadlineMs = new Date(slaDeadline).getTime()
  // eslint-disable-next-line react-hooks/purity -- email template is server-rendered, not a React hook
  const nowMs = Date.now()
  const hoursRemaining = Math.max(0, Math.floor((deadlineMs - nowMs) / 3_600_000))

  const hoursLabel =
    hoursRemaining === 0 ? 'menos de 1 hora restante' : `${hoursRemaining} horas restantes`

  return (
    <BaseEmail previewText={`Solicitação de aprovação — ${documentTitle}`}>
      <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
        Solicitação de aprovação
      </Heading>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 12px' }}>
        <strong>{requestedBy}</strong> solicitou sua aprovação do documento{' '}
        <strong>{documentTitle}</strong> no projeto <strong>{projectName}</strong>.
      </Text>

      {/* SLA destaque */}
      <Section
        style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '6px',
          padding: '12px 16px',
          margin: '16px 0',
        }}
      >
        <Text style={{ color: '#92400E', fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
          ⏰ {hoursLabel} para aprovação
        </Text>
      </Section>

      <Button
        href={approvalUrl}
        style={{
          backgroundColor: '#0F1117',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '6px',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '14px',
          fontWeight: 'bold',
          marginRight: '12px',
        }}
      >
        Revisar e Aprovar
      </Button>
    </BaseEmail>
  )
}
