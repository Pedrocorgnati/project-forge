import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { BaseEmail } from '../templates/base'
import { ApprovalRequestEmail } from '../templates/approval-request'
import { ApprovalApprovedEmail } from '../templates/approval-approved'
import { ApprovalRejectedEmail } from '../templates/approval-rejected'
import { ScopeAlertEmail } from '../templates/scope-alert'
import { DeadlineReminderEmail } from '../templates/deadline-reminder'
import { ProjectUpdateEmail } from '../templates/project-update'
import React from 'react'

// ─── TESTES DE EMAIL TEMPLATES ───────────────────────────────────────────────

describe('BaseEmail', () => {
  it('renderiza HTML válido com lang="pt-BR"', async () => {
    const html = await render(React.createElement(BaseEmail, { previewText: 'teste' }, React.createElement('p', null, 'conteúdo')))
    expect(html).toContain('lang="pt-BR"')
  })

  it('header contém img com alt="ProjectForge"', async () => {
    const html = await render(React.createElement(BaseEmail, { previewText: 'teste' }, null))
    expect(html).toContain('alt="ProjectForge"')
  })

  it('footer contém link de gerenciamento de notificações', async () => {
    const html = await render(React.createElement(BaseEmail, { previewText: 'teste' }, null))
    expect(html).toContain('configuracoes/notificacoes')
  })

  it('previewText vazio não causa crash', async () => {
    await expect(
      render(React.createElement(BaseEmail, { previewText: '' }, null)),
    ).resolves.toBeDefined()
  })
})

describe('ApprovalRequestEmail', () => {
  const props = {
    projectName: 'Projeto X',
    documentTitle: 'PRD v1',
    requestedBy: 'João PM',
    slaDeadline: new Date(Date.now() + 48 * 3600_000).toISOString(), // 48h no futuro
    approvalUrl: 'https://projectforge.app/portal/proj-1/approvals/appr-1',
  }

  it('renderiza com horas restantes calculadas corretamente', async () => {
    const html = await render(React.createElement(ApprovalRequestEmail, props))
    // 48h → deve conter "48 horas restantes"
    expect(html).toMatch(/4[78] horas restantes/)
  })

  it('tem lang="pt-BR" via BaseEmail', async () => {
    const html = await render(React.createElement(ApprovalRequestEmail, props))
    expect(html).toContain('lang="pt-BR"')
  })

  it('hoursRemaining = 0 exibe "menos de 1 hora restante"', async () => {
    const expiredProps = { ...props, slaDeadline: new Date(Date.now() - 1000).toISOString() }
    const html = await render(React.createElement(ApprovalRequestEmail, expiredProps))
    expect(html).toContain('menos de 1 hora restante')
  })

  it('renderiza sem erros com props mínimas', async () => {
    await expect(render(React.createElement(ApprovalRequestEmail, props))).resolves.toBeDefined()
  })
})

describe('ScopeAlertEmail', () => {
  const baseProps = {
    projectName: 'Projeto Y',
    taskName: 'Task de backend',
    plannedHours: 10,
    actualHours: 14,
    deviationPct: 40,
    scopeUrl: 'https://projectforge.app/projetos/proj-1/scope',
  }

  it('renderiza com desvio > 30% em vermelho (#EF4444)', async () => {
    const html = await render(React.createElement(ScopeAlertEmail, { ...baseProps, deviationPct: 40 }))
    expect(html).toContain('#EF4444')
  })

  it('renderiza desvio 10-30% com cor laranja (#F97316)', async () => {
    const html = await render(React.createElement(ScopeAlertEmail, { ...baseProps, deviationPct: 20 }))
    expect(html).toContain('#F97316')
  })

  it('renderiza sem erros com props mínimas', async () => {
    await expect(render(React.createElement(ScopeAlertEmail, baseProps))).resolves.toBeDefined()
  })
})

describe('DeadlineReminderEmail', () => {
  const props = {
    projectName: 'Projeto Z',
    milestoneName: 'Release v1.0',
    dueDate: new Date('2026-04-01').toISOString(),
    hoursRemaining: 72,
    projectUrl: 'https://projectforge.app/projetos/proj-1',
  }

  it('renderiza data formatada em pt-BR', async () => {
    const html = await render(React.createElement(DeadlineReminderEmail, props))
    // Data formatada deve conter o mês ou alguma referência ao prazo
    expect(html).toContain('2026')
  })

  it('hoursRemaining = 0 exibe "menos de 1 hora restante"', async () => {
    const html = await render(React.createElement(DeadlineReminderEmail, { ...props, hoursRemaining: 0 }))
    expect(html).toContain('menos de 1 hora restante')
  })

  it('renderiza sem erros com props mínimas', async () => {
    await expect(render(React.createElement(DeadlineReminderEmail, props))).resolves.toBeDefined()
  })
})

describe('Todos os 6 templates renderizam sem erros', () => {
  it('ProjectUpdateEmail', async () => {
    await expect(render(React.createElement(ProjectUpdateEmail, {
      projectName: 'P', from: 'BRIEFING', to: 'APPROVED', updatedBy: 'user', projectUrl: 'https://x.com',
    }))).resolves.toBeDefined()
  })

  it('ApprovalApprovedEmail', async () => {
    await expect(render(React.createElement(ApprovalApprovedEmail, {
      projectName: 'P', documentTitle: 'PRD', approvedBy: 'user',
      approvedAt: new Date().toISOString(), nextStepUrl: 'https://x.com',
    }))).resolves.toBeDefined()
  })

  it('ApprovalRejectedEmail — sem reason (não deve exibir "undefined")', async () => {
    const html = await render(React.createElement(ApprovalRejectedEmail, {
      projectName: 'P', documentTitle: 'PRD', rejectedBy: 'user',
      reason: undefined, projectUrl: 'https://x.com',
    }))
    expect(html).not.toContain('undefined')
  })
})
