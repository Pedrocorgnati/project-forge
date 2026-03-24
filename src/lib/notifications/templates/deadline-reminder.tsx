import { Button, Heading, Text } from '@react-email/components'
import { BaseEmail } from './base'

// ─── DEADLINE REMINDER EMAIL ──────────────────────────────────────────────────

interface DeadlineReminderEmailProps {
  projectName: string
  milestoneName: string
  dueDate: string // ISO string
  hoursRemaining: number
  projectUrl: string
}

export function DeadlineReminderEmail({
  projectName,
  milestoneName,
  dueDate,
  hoursRemaining,
  projectUrl,
}: DeadlineReminderEmailProps) {
  const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
  }).format(new Date(dueDate))

  const hoursLabel =
    hoursRemaining === 0 ? 'menos de 1 hora restante' : `${hoursRemaining} horas restantes`

  return (
    <BaseEmail previewText={`Lembrete de deadline — ${milestoneName}`}>
      <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
        Lembrete de deadline
      </Heading>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 12px' }}>
        O milestone <strong>{milestoneName}</strong> do projeto{' '}
        <strong>{projectName}</strong> está se aproximando.
      </Text>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 8px' }}>
        <strong>Prazo:</strong> {dateFormatted}
      </Text>
      <Text
        style={{
          color: '#F97316',
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 24px',
        }}
      >
        ⏰ {hoursLabel}
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
