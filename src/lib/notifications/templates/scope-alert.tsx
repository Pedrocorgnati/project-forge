import { Button, Heading, Text, Section } from '@react-email/components'
import { BaseEmail } from './base'

// ─── SCOPE ALERT EMAIL ────────────────────────────────────────────────────────

interface ScopeAlertEmailProps {
  projectName: string
  taskName: string
  plannedHours: number
  actualHours: number
  deviationPct: number
  scopeUrl: string
}

export function ScopeAlertEmail({
  projectName,
  taskName,
  plannedHours,
  actualHours,
  deviationPct,
  scopeUrl,
}: ScopeAlertEmailProps) {
  // Cor de severidade baseada no desvio
  const deviationColor = deviationPct > 30 ? '#EF4444' : deviationPct >= 10 ? '#F97316' : '#F59E0B'

  return (
    <BaseEmail previewText={`⚠️ Alerta de escopo — ${projectName}`}>
      <Heading style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: '0 0 16px' }}>
        ⚠️ Alerta de escopo detectado
      </Heading>
      <Text style={{ color: '#374151', fontSize: '14px', lineHeight: '20px', margin: '0 0 12px' }}>
        A tarefa <strong>{taskName}</strong> no projeto <strong>{projectName}</strong> ultrapassou o
        escopo planejado.
      </Text>

      {/* Destaque de desvio */}
      <Section
        style={{
          backgroundColor: '#FEF2F2',
          border: `2px solid ${deviationColor}`,
          borderRadius: '6px',
          padding: '16px',
          margin: '16px 0',
        }}
      >
        <Text style={{ color: deviationColor, fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px' }}>
          +{deviationPct}% de desvio
        </Text>
        <Text style={{ color: '#374151', fontSize: '14px', margin: 0 }}>
          Planejado: {plannedHours}h | Realizado: {actualHours}h
        </Text>
      </Section>

      <Button
        href={scopeUrl}
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
        Ver ScopeShield
      </Button>
    </BaseEmail>
  )
}
