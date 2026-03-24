import { Button, Heading, Text } from '@react-email/components'
import { BaseEmail } from './base'

// ─── PROJECT UPDATE EMAIL ─────────────────────────────────────────────────────

interface ProjectUpdateEmailProps {
  projectName: string
  from: string
  to: string
  updatedBy: string
  projectUrl: string
}

export function ProjectUpdateEmail({
  projectName,
  from,
  to,
  updatedBy,
  projectUrl,
}: ProjectUpdateEmailProps) {
  return (
    <BaseEmail previewText={`Status do projeto ${projectName} atualizado`}>
      <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
        Status do projeto atualizado
      </Heading>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 12px' }}>
        O projeto <strong>{projectName}</strong> teve seu status atualizado por{' '}
        <strong>{updatedBy}</strong>:
      </Text>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 24px' }}>
        <strong>{from}</strong> → <strong>{to}</strong>
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
        Ver Projeto
      </Button>
    </BaseEmail>
  )
}
