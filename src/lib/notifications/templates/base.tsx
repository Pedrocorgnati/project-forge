import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import type { ReactNode } from 'react'

// ─── BASE EMAIL TEMPLATE ──────────────────────────────────────────────────────

interface BaseEmailProps {
  previewText: string
  children?: ReactNode
}

export function BaseEmail({ previewText, children }: BaseEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px' }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            margin: '0 auto',
            maxWidth: '600px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section style={{ backgroundColor: '#0F1117', padding: '20px' }}>
            <Img
              src="https://projectforge.app/email-logo.png"
              width={150}
              height={40}
              alt="ProjectForge"
            />
          </Section>

          {/* Content */}
          <Section style={{ padding: '32px 24px' }}>{children}</Section>

          <Hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: 0 }} />

          {/* Footer */}
          <Section style={{ padding: '16px 24px', textAlign: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: '12px', lineHeight: '16px', margin: '0 0 8px' }}>
              Você está recebendo este email porque tem uma conta no ProjectForge.
            </Text>
            <Link
              href="https://projectforge.app/configuracoes/notificacoes"
              style={{ color: '#6B7280', fontSize: '12px' }}
            >
              Gerenciar notificações
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
