import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  DocumentStatus,
  DocumentType,
  EstimateStatus,
  TaskStatus,
  IndexationStatus,
  ScopeResult,
  AlertTier,
  NotificationChannel,
} from '@prisma/client'

const prisma = new PrismaClient()

export async function seedDev(orgId: string) {
  // ── 1. Users (4 roles) ────────────────────────────────────────────────────
  const [socio, pm, dev, _cliente] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'pedro@projectforge.app' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        organizationId: orgId,
        email: 'pedro@projectforge.app',
        name: 'Pedro Socio',
        role: UserRole.SOCIO,
        avatarUrl: 'https://i.pravatar.cc/150?u=socio',
      },
    }),
    prisma.user.upsert({
      where: { email: 'pm@projectforge.app' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        organizationId: orgId,
        email: 'pm@projectforge.app',
        name: 'Ana PM',
        role: UserRole.PM,
        avatarUrl: 'https://i.pravatar.cc/150?u=pm',
      },
    }),
    prisma.user.upsert({
      where: { email: 'dev@projectforge.app' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        organizationId: orgId,
        email: 'dev@projectforge.app',
        name: 'Carlos Dev',
        role: UserRole.DEV,
        avatarUrl: 'https://i.pravatar.cc/150?u=dev',
      },
    }),
    prisma.user.upsert({
      where: { email: 'cliente@example.com' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        organizationId: orgId,
        email: 'cliente@example.com',
        name: 'João Cliente',
        role: UserRole.CLIENTE,
        avatarUrl: 'https://i.pravatar.cc/150?u=cliente',
      },
    }),
  ])

  // ── 2. Projects ───────────────────────────────────────────────────────────
  const project1 = await prisma.project.upsert({
    where: { IDX_projects_slug: { organizationId: orgId, slug: 'ecommerce-redesign' } },
    update: {},
    create: {
      organizationId: orgId,
      name: 'E-commerce Redesign',
      slug: 'ecommerce-redesign',
      status: ProjectStatus.IN_PROGRESS,
      revenue: 45000,
      currency: 'BRL',
      description: 'Redesign completo da plataforma de e-commerce',
    },
  })

  const project2 = await prisma.project.upsert({
    where: { IDX_projects_slug: { organizationId: orgId, slug: 'app-delivery' } },
    update: {},
    create: {
      organizationId: orgId,
      name: 'App Delivery',
      slug: 'app-delivery',
      status: ProjectStatus.BRIEFING,
      revenue: null,
      currency: 'BRL',
      description: 'Aplicativo mobile de delivery de refeições',
    },
  })

  // ── 3. ProjectMembers ─────────────────────────────────────────────────────
  await Promise.all([
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project1.id, userId: pm.id } },
      update: {},
      create: { projectId: project1.id, userId: pm.id, role: UserRole.PM },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project1.id, userId: dev.id } },
      update: {},
      create: { projectId: project1.id, userId: dev.id, role: UserRole.DEV },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project2.id, userId: pm.id } },
      update: {},
      create: { projectId: project2.id, userId: pm.id, role: UserRole.PM },
    }),
  ])

  // ── 4. Brief + BriefSession + BriefQuestions ──────────────────────────────
  const brief1 = await prisma.brief.upsert({
    where: { projectId: project1.id },
    update: {},
    create: {
      projectId: project1.id,
      status: 'COMPLETED',
      aiMetadata: { stack: 'Next.js + Supabase', scope: 'MVP em 3 meses' },
    },
  })

  const existingSession = await prisma.briefSession.findFirst({
    where: { briefId: brief1.id },
  })
  if (!existingSession) {
    const session = await prisma.briefSession.create({
      data: {
        briefId: brief1.id,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    await prisma.briefQuestion.createMany({
      data: [
        { sessionId: session.id, questionText: 'Qual o objetivo principal?', answerText: 'Aumentar taxa de conversão', order: 1, answeredAt: new Date() },
        { sessionId: session.id, questionText: 'Qual o prazo desejado?', answerText: '3 meses', order: 2, answeredAt: new Date() },
        { sessionId: session.id, questionText: 'Qual o orçamento disponível?', answerText: 'R$ 45.000', order: 3, answeredAt: new Date() },
      ],
    })
  }

  // ── 5. Document (PRD) ─────────────────────────────────────────────────────
  const existingDoc = await prisma.document.findFirst({
    where: { projectId: project1.id, type: DocumentType.PRD },
  })
  const prd = existingDoc ?? await prisma.document.create({
    data: {
      projectId: project1.id,
      createdBy: pm.id,
      type: DocumentType.PRD,
      title: 'PRD — E-commerce Redesign v1.0',
      status: DocumentStatus.APPROVED,
      currentVersion: 1,
    },
  })

  await prisma.documentVersion.upsert({
    where: { documentId_versionNumber: { documentId: prd.id, versionNumber: 1 } },
    update: {},
    create: {
      documentId: prd.id,
      createdBy: pm.id,
      versionNumber: 1,
      content: '# PRD — E-commerce Redesign\n\n## Objetivo\nRedesign completo...',
      contentHash: 'abc123hash',
      metadata: { approvedBy: socio.id },
    },
  })

  // ── 6. Estimate + EstimateItems + EstimateVersion ─────────────────────────
  const existingEstimate = await prisma.estimate.findFirst({
    where: { projectId: project1.id },
  })
  const estimate = existingEstimate ?? await prisma.estimate.create({
    data: {
      projectId: project1.id,
      createdBy: pm.id,
      version: 1,
      totalMin: 16000,
      totalMax: 24000,
      currency: 'BRL',
      confidence: 'HIGH' as const,
      status: EstimateStatus.READY,
    },
  })

  const existingItems = await prisma.estimateItem.findFirst({ where: { estimateId: estimate.id } })
  if (!existingItems) {
    await prisma.estimateItem.createMany({
      data: [
        { estimateId: estimate.id, category: 'frontend-page', description: 'Telas e componentes', hoursMin: 60, hoursMax: 90, hourlyRate: 100, riskFactor: 1.0, costMin: 6000, costMax: 9000 },
        { estimateId: estimate.id, category: 'backend-api', description: 'APIs e integrações', hoursMin: 60, hoursMax: 90, hourlyRate: 100, riskFactor: 1.1, costMin: 6000, costMax: 9000 },
        { estimateId: estimate.id, category: 'devops', description: 'CI/CD e deploy', hoursMin: 20, hoursMax: 40, hourlyRate: 100, riskFactor: 1.0, costMin: 2000, costMax: 4000 },
        { estimateId: estimate.id, category: 'testing', description: 'Testes e validação', hoursMin: 20, hoursMax: 20, hourlyRate: 100, riskFactor: 1.0, costMin: 2000, costMax: 2000 },
      ],
    })

    await prisma.estimateVersion.create({
      data: {
        estimateId: estimate.id,
        version: 1,
        snapshot: { minHours: 160, maxHours: 240, confidence: 0.78, breakdown: { frontend: 80, backend: 80, infra: 40 } },
        changedBy: pm.id,
      },
    })
  }

  // ── 7. Tasks (Kanban board) ───────────────────────────────────────────────
  const existingTasks = await prisma.task.findFirst({ where: { projectId: project1.id } })
  if (!existingTasks) {
    await prisma.task.createMany({
      data: [
        { projectId: project1.id, assigneeId: dev.id, createdBy: pm.id, title: 'Configurar ambiente Next.js', status: TaskStatus.DONE, position: 0 },
        { projectId: project1.id, assigneeId: dev.id, createdBy: pm.id, title: 'Implementar design system', status: TaskStatus.IN_PROGRESS, position: 1 },
        { projectId: project1.id, assigneeId: pm.id, createdBy: pm.id, title: 'Definir fluxo de checkout', status: TaskStatus.TODO, position: 2 },
        { projectId: project1.id, assigneeId: null, createdBy: pm.id, title: 'Integração com gateway de pagamento', status: TaskStatus.TODO, position: 3, estimatedHours: 24 },
      ],
    })
  }

  // ── 8. ChangeOrder ────────────────────────────────────────────────────────
  const existingCO = await prisma.changeOrder.findFirst({ where: { projectId: project1.id } })
  if (!existingCO) {
    await prisma.changeOrder.create({
      data: {
        projectId: project1.id,
        createdBy: pm.id,
        title: 'Adicionar módulo de cupons de desconto',
        description: 'Cliente solicitou módulo de cupons não previsto no escopo original.',
        status: 'DRAFT',
        impactTier: 'MEDIUM',
        hoursImpact: 20,
        costImpact: 2800,
        scopeImpact: 'Novo módulo: gestão de cupons e aplicação no checkout',
      },
    })
  }

  // ── 9. RAGIndex ───────────────────────────────────────────────────────────
  await prisma.rAGIndex.upsert({
    where: { projectId: project1.id },
    update: {},
    create: {
      projectId: project1.id,
      indexationStatus: IndexationStatus.PENDING,
      indexedExtensions: ['.ts', '.tsx', '.md'],
    },
  })

  // ── 10. TimesheetEntries ──────────────────────────────────────────────────
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const existingTimesheet = await prisma.timesheetEntry.findFirst({ where: { projectId: project1.id } })
  if (!existingTimesheet) {
    await prisma.timesheetEntry.createMany({
      data: [
        { projectId: project1.id, userId: dev.id, role: UserRole.DEV, hours: 6, workDate: twoDaysAgo, notes: 'Config ambiente' },
        { projectId: project1.id, userId: dev.id, role: UserRole.DEV, hours: 8, workDate: yesterday, notes: 'Design system' },
        { projectId: project1.id, userId: pm.id, role: UserRole.PM, hours: 4, workDate: yesterday, notes: 'Reunião com cliente' },
      ],
    })
  }

  // ── 11. ProjectCostRates ──────────────────────────────────────────────────
  for (const rate of [
    { role: UserRole.SOCIO, hourlyRate: 280 },
    { role: UserRole.PM, hourlyRate: 200 },
    { role: UserRole.DEV, hourlyRate: 160 },
  ]) {
    await prisma.projectCostRate.upsert({
      where: { projectId_role: { projectId: project1.id, role: rate.role } },
      update: {},
      create: { projectId: project1.id, ...rate, currency: 'BRL' },
    })
  }

  // ── 12. ClientAccess + ApprovalRequest ───────────────────────────────────
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 3)
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)

  const existingAccess = await prisma.clientAccess.findFirst({ where: { projectId: project1.id } })
  if (!existingAccess) {
    const access = await prisma.clientAccess.create({
      data: {
        projectId: project1.id,
        clientEmail: 'joao@cliente.com',
        clientName: 'João Cliente',
        inviteToken: `dev-token-${project1.id}`,
        expiresAt: expiry,
      },
    })

    await prisma.approvalRequest.create({
      data: {
        projectId: project1.id,
        clientAccessId: access.id,
        requestedBy: pm.id,
        type: 'DOCUMENT',
        title: 'Aprovação do PRD v1',
        description: 'Por favor revise e aprove o PRD da fase 1 do projeto.',
        documentId: prd.id,
        documentType: 'PRD',
        status: 'PENDING',
        slaDeadline: deadline,
      },
    })
  }

  // ── 13. EmailLog ──────────────────────────────────────────────────────────
  const existingEmail = await prisma.emailLog.findFirst({ where: { projectId: project1.id } })
  if (!existingEmail) {
    await prisma.emailLog.create({
      data: {
        to: 'joao@cliente.com',
        type: 'invite',
        projectId: project1.id,
        subject: 'Convite para o portal do projeto E-commerce Redesign',
        status: 'SENT',
        sentAt: new Date(),
        resendMessageId: 'dev-resend-msg-001',
      },
    })
  }

  // ── 14. Notifications ─────────────────────────────────────────────────────
  const existingNotif = await prisma.notification.findFirst({ where: { userId: pm.id } })
  if (!existingNotif) {
    await prisma.notification.createMany({
      data: [
        {
          userId: pm.id,
          projectId: project1.id,
          type: 'APPROVAL_PENDING',
          channel: 'IN_APP',
          priority: 'HIGH',
          payload: { documentTitle: 'PRD — E-commerce Redesign v1.0', slaDeadline: deadline.toISOString() },
        },
        {
          userId: socio.id,
          projectId: project1.id,
          type: 'ESTIMATE_APPROVED',
          channel: 'IN_APP',
          priority: 'MEDIUM',
          payload: { estimateId: estimate.id, totalHours: 200 },
        },
      ],
    })
  }

  // ── 15. ScopeBaseline ────────────────────────────────────────────────────
  const existingBaseline = await prisma.scopeBaseline.findFirst({ where: { projectId: project1.id } })
  if (!existingBaseline) {
    await prisma.scopeBaseline.create({
      data: {
        projectId: project1.id,
        estimateId: estimate.id,
        tasks: [
          { title: 'Configurar ambiente Next.js', status: 'DONE' },
          { title: 'Implementar design system', status: 'IN_PROGRESS' },
          { title: 'Definir fluxo de checkout', status: 'TODO' },
          { title: 'Integração com gateway de pagamento', status: 'TODO' },
        ],
        features: [
          { name: 'Catálogo de produtos', priority: 'HIGH' },
          { name: 'Checkout redesenhado', priority: 'HIGH' },
          { name: 'Painel do admin', priority: 'MEDIUM' },
        ],
      },
    })
  }

  // ── 16. ScopeAlert ──────────────────────────────────────────────────────
  const existingAlert = await prisma.scopeAlert.findFirst({ where: { projectId: project1.id } })
  const firstTaskForAlert = await prisma.task.findFirst({ where: { projectId: project1.id } })
  if (!existingAlert && firstTaskForAlert) {
    await prisma.scopeAlert.create({
      data: {
        projectId: project1.id,
        taskId: firstTaskForAlert.id,
        type: 'SCOPE_CREEP',
        severity: AlertTier.MEDIUM,
        description: 'Módulo de cupons adicionado fora do escopo original — possível scope creep.',
        aiRationale: 'A task descreve funcionalidade de cupons que não consta no estimate aprovado.',
      },
    })
  }

  // ── 17. ScopeValidation (requires a task) ───────────────────────────────
  const firstTask = await prisma.task.findFirst({ where: { projectId: project1.id } })
  if (firstTask) {
    const existingSV = await prisma.scopeValidation.findFirst({ where: { taskId: firstTask.id } })
    if (!existingSV) {
      await prisma.scopeValidation.create({
        data: {
          taskId: firstTask.id,
          result: ScopeResult.VALID,
          similarityScore: 0.87,
          reasoning: 'Task alinhada com requisito de configuração de ambiente do PRD.',
          matchedRequirements: ['REQ-001', 'REQ-002'],
        },
      })
    }
  }

  // ── 18. ProfitReport ────────────────────────────────────────────────────
  const existingProfit = await prisma.profitReport.findFirst({ where: { projectId: project1.id } })
  if (!existingProfit) {
    const periodStart = new Date()
    periodStart.setDate(1)
    await prisma.profitReport.create({
      data: {
        projectId: project1.id,
        period: 'FULL',
        periodStart,
        periodEnd: today,
        revenue: 45000,
        cost: 2720,
        margin: 42280,
        marginPct: 93.96,
        hoursLogged: 18,
        billableHours: 14,
        teamCosts: [
          { userId: 'seed', userName: 'Dev 1', role: 'DEV', hours: 14, billableHours: 14, effectiveRate: 160, rateSource: 'role-config', cost: 2240, pctOfTotal: 82.4 },
          { userId: 'seed', userName: 'PM 1', role: 'PM', hours: 4, billableHours: 4, effectiveRate: 120, rateSource: 'global-default', cost: 480, pctOfTotal: 17.6 },
        ],
      },
    })
  }

  // ── 19. Checkpoint ──────────────────────────────────────────────────────
  const existingCheckpoint = await prisma.checkpoint.findFirst({ where: { projectId: project1.id } })
  if (!existingCheckpoint) {
    await prisma.checkpoint.create({
      data: {
        projectId: project1.id,
        name: `Checkpoint ${today.toLocaleDateString('pt-BR')}`,
        snapshotData: {
          period: 'FULL',
          capturedAt: today.toISOString(),
          revenue: 45000,
          cost: 2720,
          margin: 42280,
          marginPct: 93.96,
          hoursLogged: 18,
          billableHours: 14,
          billableRatio: 77.8,
          teamCosts: [],
          burnRate: { daysElapsed: 30, daysRemaining: null, costPerDay: 90.67, projectedTotalCost: 2720, projectedMargin: 42280, projectedMarginPct: 93.96, isOverBudget: false },
        },
      },
    })
  }

  // ── 20. Events ──────────────────────────────────────────────────────────
  const existingEvent = await prisma.event.findFirst({ where: { projectId: project1.id } })
  if (!existingEvent) {
    await prisma.event.createMany({
      data: [
        {
          projectId: project1.id,
          type: 'BRIEF_COMPLETED',
          payload: { briefId: brief1.id, questionsCount: 3 },
          sourceModule: 'briefforge',
        },
        {
          projectId: project1.id,
          type: 'ESTIMATE_APPROVED',
          payload: { estimateId: estimate.id, confidence: 0.78 },
          sourceModule: 'estimai',
          processedAt: new Date(),
        },
      ],
    })
  }

  // ── 21. NotificationPreference ──────────────────────────────────────────
  await prisma.notificationPreference.upsert({
    where: {
      userId_eventType_channel: {
        userId: pm.id,
        eventType: 'APPROVAL_PENDING',
        channel: NotificationChannel.IN_APP,
      },
    },
    update: {},
    create: {
      userId: pm.id,
      eventType: 'APPROVAL_PENDING',
      channel: NotificationChannel.IN_APP,
      enabled: true,
    },
  })

  // ── 22. RAGDocument ─────────────────────────────────────────────────────
  const ragIndex = await prisma.rAGIndex.findFirst({ where: { projectId: project1.id } })
  if (ragIndex) {
    const existingRagDoc = await prisma.rAGDocument.findFirst({ where: { ragIndexId: ragIndex.id } })
    if (!existingRagDoc) {
      await prisma.rAGDocument.create({
        data: {
          ragIndexId: ragIndex.id,
          sourceType: 'github',
          sourcePath: '/src/app/page.tsx',
          content: 'export default function Home() { return <main>E-commerce Redesign</main> }',
          metadata: { language: 'typescript', linesOfCode: 1 },
        },
      })
    }
  }

  console.log('  ✓ 4 Users, 2 Projects, Brief+Session+3Questions, PRD+Version, Estimate+4Items+Version')
  console.log('  ✓ 4 Tasks, 1 ChangeOrder, RAGIndex, 3 Timesheets, ClientAccess, ApprovalRequest, EmailLog, Notifications')
  console.log('  ✓ ScopeBaseline, ScopeAlert, ScopeValidation, ProfitReport, Checkpoint, 2 Events, NotificationPref, RAGDocument')
}
