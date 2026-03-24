/**
 * dev-extended.ts — Cobertura completa de enums, edge cases e entidades faltantes
 *
 * Pré-requisito: seedDev(orgId) já executado.
 * Executado automaticamente por seed.ts em NODE_ENV !== 'production'.
 *
 * Cobertura adicionada:
 *   ProjectStatus:        ESTIMATION, APPROVED, COMPLETED, ARCHIVED
 *   DocumentStatus:       DRAFT, PENDING_APPROVAL, REJECTED, OBSOLETE
 *   DocumentType:         CHANGE_ORDER, ESTIMATE, DELIVERY
 *   EstimateStatus:       GENERATING, ARCHIVED
 *   ConfidenceLevel:      LOW, MEDIUM
 *   TaskStatus:           REVIEW, BLOCKED + TaskPriority P0, P1, P3
 *   ScopeResult:          INVALID, PARTIAL, NEEDS_REVIEW
 *   ScopeAlertType:       OUT_OF_SCOPE, DUPLICATE
 *   AlertStatus:          ACKNOWLEDGED, DISMISSED
 *   ChangeOrderStatus:    SENT, PENDING_APPROVAL, APPROVED, REJECTED, EXPIRED
 *   BriefStatus:          DRAFT, IN_PROGRESS
 *   SessionStatus:        ACTIVE, CANCELLED
 *   PRDStatus:            GENERATING, READY, ERROR
 *   PeriodType:           WEEKLY, MONTHLY
 *   ClientAccessStatus:   ACTIVE, REVOKED
 *   IndexationStatus:     IN_PROGRESS, COMPLETE, FAILED
 *   NotificationPriority: LOW, URGENT
 *   NotificationChannel:  EMAIL
 *   Entidades novas:      PRDDocument, InviteToken, AuditLog, ApprovalLog,
 *                         ApprovalHistory, ClientFeedback, DocumentAccessLog,
 *                         CostConfig, CostOverride, ChangeOrderTask, GitHubSync, RAGQuery
 */

import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  DocumentStatus,
  DocumentType,
  EstimateStatus,
  ConfidenceLevel,
  TaskStatus,
  TaskPriority,
  ScopeResult,
  ScopeAlertType,
  AlertStatus,
  AlertTier,
  ChangeOrderStatus,
  BriefStatus,
  SessionStatus,
  PRDStatus,
  PeriodType,
  ClientAccessStatus,
  IndexationStatus,
  NotificationChannel,
  NotificationPriority,
  ApprovalAction,
  Prisma,
} from '@prisma/client'

const prisma = new PrismaClient()

// ─── helpers ──────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

const daysFromNow = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

// ─── exports ──────────────────────────────────────────────────────────────────

export async function seedDevExtended(orgId: string) {
  // Carregar usuários já criados pelo seedDev
  const [socio, pm, dev] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email: 'pedro@projectforge.app' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'pm@projectforge.app' } }),
    prisma.user.findUniqueOrThrow({ where: { email: 'dev@projectforge.app' } }),
  ])

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 1 — Projetos com todos os status faltantes
  // Cobre: ESTIMATION, APPROVED, COMPLETED, ARCHIVED
  // ══════════════════════════════════════════════════════════════════════════

  const projectEstimation = await prisma.project.upsert({
    where: { IDX_projects_slug: { organizationId: orgId, slug: 'saas-financeiro' } },
    update: {},
    create: {
      organizationId: orgId,
      name: 'SaaS Financeiro',
      slug: 'saas-financeiro',
      status: ProjectStatus.ESTIMATION,
      currency: 'BRL',
      description: 'Plataforma SaaS para gestão financeira de pequenas empresas',
    },
  })

  const projectApproved = await prisma.project.upsert({
    where: { IDX_projects_slug: { organizationId: orgId, slug: 'portal-rh' } },
    update: {},
    create: {
      organizationId: orgId,
      name: 'Portal RH',
      slug: 'portal-rh',
      status: ProjectStatus.APPROVED,
      revenue: 32000,
      currency: 'BRL',
      description: 'Portal interno de gestão de recursos humanos',
      startedAt: daysFromNow(7),
    },
  })

  const projectCompleted = await prisma.project.upsert({
    where: { IDX_projects_slug: { organizationId: orgId, slug: 'landing-page-v2' } },
    update: {},
    create: {
      organizationId: orgId,
      name: 'Landing Page v2',
      slug: 'landing-page-v2',
      status: ProjectStatus.COMPLETED,
      revenue: 8500,
      currency: 'BRL',
      description: 'Redesign da landing page institucional com foco em conversão',
      startedAt: daysAgo(60),
      completedAt: daysAgo(5),
      baseHours: 40,
      totalHours: 40,
    },
  })

  const projectArchived = await prisma.project.upsert({
    where: { IDX_projects_slug: { organizationId: orgId, slug: 'app-legado' } },
    update: {},
    create: {
      organizationId: orgId,
      name: 'App Legado — Migração',
      slug: 'app-legado',
      status: ProjectStatus.ARCHIVED,
      currency: 'BRL',
      description: 'Projeto de migração cancelado — cliente encerrou contrato',
    },
  })

  // Adicionar membros nos novos projetos
  await Promise.all([
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projectEstimation.id, userId: pm.id } },
      update: {},
      create: { projectId: projectEstimation.id, userId: pm.id, role: UserRole.PM },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projectApproved.id, userId: pm.id } },
      update: {},
      create: { projectId: projectApproved.id, userId: pm.id, role: UserRole.PM },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projectApproved.id, userId: dev.id } },
      update: {},
      create: { projectId: projectApproved.id, userId: dev.id, role: UserRole.DEV },
    }),
    prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: projectCompleted.id, userId: dev.id } },
      update: {},
      create: { projectId: projectCompleted.id, userId: dev.id, role: UserRole.DEV },
    }),
  ])

  console.log('  ✓ Projetos: ESTIMATION, APPROVED, COMPLETED, ARCHIVED')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 2 — Brief com todos os status + BriefSession com todos os status
  // Cobre: BriefStatus (DRAFT, IN_PROGRESS), SessionStatus (ACTIVE, CANCELLED)
  // ══════════════════════════════════════════════════════════════════════════

  // Brief DRAFT (projeto em estimação — ainda não iniciou entrevista)
  const briefDraft = await prisma.brief.upsert({
    where: { projectId: projectEstimation.id },
    update: {},
    create: {
      projectId: projectEstimation.id,
      status: BriefStatus.DRAFT,
    },
  })

  // Brief IN_PROGRESS (portal-rh — entrevista em andamento)
  const briefInProgress = await prisma.brief.upsert({
    where: { projectId: projectApproved.id },
    update: {},
    create: {
      projectId: projectApproved.id,
      status: BriefStatus.IN_PROGRESS,
      aiMetadata: { currentQuestion: 3, totalQuestions: 8, partialAnswers: true },
    },
  })

  // BriefSession ACTIVE — entrevista em curso (edge case: usuário fechou o browser)
  const existingActiveSession = await prisma.briefSession.findFirst({
    where: { briefId: briefInProgress.id, status: SessionStatus.ACTIVE },
  })
  if (!existingActiveSession) {
    const activeSession = await prisma.briefSession.create({
      data: {
        briefId: briefInProgress.id,
        status: SessionStatus.ACTIVE,
        startedAt: daysAgo(1),
      },
    })

    await prisma.briefQuestion.createMany({
      data: [
        { sessionId: activeSession.id, order: 1, questionText: 'Qual o objetivo principal do portal?', answerText: 'Automatizar processos de admissão e férias', answeredAt: daysAgo(1) },
        { sessionId: activeSession.id, order: 2, questionText: 'Quantos colaboradores usarão o sistema?', answerText: '150 funcionários', answeredAt: daysAgo(1) },
        { sessionId: activeSession.id, order: 3, questionText: 'Precisa de integração com sistemas externos?', answerText: null },  // pergunta não respondida — edge case
      ],
    })
  }

  // BriefSession CANCELLED — entrevista cancelada antes de completar
  const existingCancelledSession = await prisma.briefSession.findFirst({
    where: { briefId: briefDraft.id, status: SessionStatus.CANCELLED },
  })
  if (!existingCancelledSession) {
    await prisma.briefSession.create({
      data: {
        briefId: briefDraft.id,
        status: SessionStatus.CANCELLED,
        startedAt: daysAgo(3),
        cancelledAt: daysAgo(3),
      },
    })
  }

  console.log('  ✓ BriefStatus: DRAFT, IN_PROGRESS | SessionStatus: ACTIVE, CANCELLED')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 3 — PRDDocument com todos os status
  // Cobre: PRDStatus (GENERATING, READY, ERROR)
  // ══════════════════════════════════════════════════════════════════════════

  // Precisa de um Brief COMPLETED para associar o PRDDocument
  // Usar o brief do projeto existente (ecommerce-redesign)
  const briefCompleted = await prisma.brief.findFirst({
    where: { status: BriefStatus.COMPLETED },
  })

  if (briefCompleted) {
    // PRDDocument READY — gerado com sucesso
    const existingPrdReady = await prisma.pRDDocument.findFirst({
      where: { briefId: briefCompleted.id, status: PRDStatus.READY },
    })
    if (!existingPrdReady) {
      await prisma.pRDDocument.create({
        data: {
          briefId: briefCompleted.id,
          version: 2,
          content: '# PRD v2 — Versão gerada com sucesso\n\n## Objetivo\nRedesign do e-commerce com foco em performance.\n\n## Escopo\n- Catálogo de produtos otimizado\n- Checkout em 3 etapas\n- Painel administrativo',
          generatedBy: pm.id,
          status: PRDStatus.READY,
        },
      })
    }

    // PRDDocument GENERATING — geração em andamento (edge case: aguardando Claude CLI)
    const existingPrdGenerating = await prisma.pRDDocument.findFirst({
      where: { briefId: briefCompleted.id, status: PRDStatus.GENERATING },
    })
    if (!existingPrdGenerating) {
      await prisma.pRDDocument.create({
        data: {
          briefId: briefCompleted.id,
          version: 3,
          content: '',
          generatedBy: pm.id,
          status: PRDStatus.GENERATING,
        },
      })
    }

    // PRDDocument ERROR — falha na geração (estado de erro documentado)
    const existingPrdError = await prisma.pRDDocument.findFirst({
      where: { briefId: briefCompleted.id, status: PRDStatus.ERROR },
    })
    if (!existingPrdError) {
      await prisma.pRDDocument.create({
        data: {
          briefId: briefCompleted.id,
          version: 4,
          content: '',
          generatedBy: pm.id,
          status: PRDStatus.ERROR,
        },
      })
    }
  }

  console.log('  ✓ PRDStatus: GENERATING, READY, ERROR')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 4 — Documents com todos os status e tipos
  // Cobre: DocumentStatus (DRAFT, PENDING_APPROVAL, REJECTED, OBSOLETE)
  //        DocumentType (CHANGE_ORDER, ESTIMATE, DELIVERY)
  // ══════════════════════════════════════════════════════════════════════════

  const project1 = await prisma.project.findFirstOrThrow({
    where: { organizationId: orgId, slug: 'ecommerce-redesign' },
  })

  const docDefs = [
    { type: DocumentType.PRD,          status: DocumentStatus.DRAFT,            title: 'PRD — Portal RH (rascunho)',               project: projectApproved },
    { type: DocumentType.PRD,          status: DocumentStatus.PENDING_APPROVAL,  title: 'PRD — Portal RH v1 (aguardando aprovação)', project: projectApproved },
    { type: DocumentType.PRD,          status: DocumentStatus.REJECTED,          title: 'PRD — App Legado (rejeitado)',              project: projectArchived },
    { type: DocumentType.PRD,          status: DocumentStatus.OBSOLETE,          title: 'PRD — E-commerce Redesign v0 (obsoleto)',   project: project1 },
    { type: DocumentType.CHANGE_ORDER, status: DocumentStatus.APPROVED,          title: 'CO-001 — Módulo de cupons',                project: project1 },
    { type: DocumentType.CHANGE_ORDER, status: DocumentStatus.PENDING_APPROVAL,  title: 'CO-002 — Integração Pix',                  project: project1 },
    { type: DocumentType.ESTIMATE,     status: DocumentStatus.APPROVED,          title: 'Estimativa v1 — E-commerce Redesign',       project: project1 },
    { type: DocumentType.ESTIMATE,     status: DocumentStatus.DRAFT,             title: 'Estimativa v1 — SaaS Financeiro',           project: projectEstimation },
    { type: DocumentType.DELIVERY,     status: DocumentStatus.APPROVED,          title: 'Entrega Final — Landing Page v2',           project: projectCompleted },
    { type: DocumentType.DELIVERY,     status: DocumentStatus.PENDING_APPROVAL,  title: 'Entrega Parcial — E-commerce Redesign',    project: project1 },
  ]

  const createdDocs: Record<string, string> = {}
  for (const def of docDefs) {
    const existing = await prisma.document.findFirst({
      where: { projectId: def.project.id, title: def.title },
    })
    if (!existing) {
      const doc = await prisma.document.create({
        data: {
          projectId: def.project.id,
          createdBy: pm.id,
          type: def.type,
          title: def.title,
          status: def.status,
          currentVersion: 1,
          slaDeadline: def.status === DocumentStatus.PENDING_APPROVAL ? daysFromNow(3) : undefined,
        },
      })
      createdDocs[def.title] = doc.id

      // Criar versão inicial para cada documento
      await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          createdBy: pm.id,
          versionNumber: 1,
          content: `# ${def.title}\n\n*Conteúdo de ${def.type} — status ${def.status}*`,
          contentHash: Buffer.from(def.title).toString('hex').slice(0, 64),
        },
      })
    }
  }

  console.log('  ✓ DocumentStatus: DRAFT, PENDING_APPROVAL, REJECTED, OBSOLETE | DocumentType: CHANGE_ORDER, ESTIMATE, DELIVERY')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 5 — Estimates com todos os status e ConfidenceLevel
  // Cobre: EstimateStatus (GENERATING, ARCHIVED), ConfidenceLevel (LOW, MEDIUM)
  // ══════════════════════════════════════════════════════════════════════════

  // Estimate GENERATING (edge case: IA processando estimativa)
  const existingEstGenerating = await prisma.estimate.findFirst({
    where: { projectId: projectEstimation.id, status: EstimateStatus.GENERATING },
  })
  if (!existingEstGenerating) {
    await prisma.estimate.create({
      data: {
        projectId: projectEstimation.id,
        createdBy: pm.id,
        version: 1,
        totalMin: 0,
        totalMax: 0,
        currency: 'BRL',
        confidence: ConfidenceLevel.LOW,
        status: EstimateStatus.GENERATING,
        aiPrompt: 'Gerar estimativa para SaaS Financeiro com base no brief preenchido.',
      },
    })
  }

  // Estimate READY com LOW confidence
  const existingEstLow = await prisma.estimate.findFirst({
    where: { projectId: projectApproved.id, confidence: ConfidenceLevel.LOW },
  })
  if (!existingEstLow) {
    const estLow = await prisma.estimate.create({
      data: {
        projectId: projectApproved.id,
        createdBy: pm.id,
        version: 1,
        totalMin: 20000,
        totalMax: 40000,
        currency: 'BRL',
        confidence: ConfidenceLevel.LOW,
        status: EstimateStatus.READY,
        aiRawResponse: '{"breakdown":{"frontend":80,"backend":100,"infra":20},"notes":"Escopo ainda impreciso"}',
      },
    })

    await prisma.estimateItem.createMany({
      data: [
        { estimateId: estLow.id, category: 'frontend-page', description: 'Telas do portal (estimativa preliminar)', hoursMin: 80, hoursMax: 160, hourlyRate: 140, riskFactor: 1.3, costMin: 11200, costMax: 22400 },
        { estimateId: estLow.id, category: 'backend-api', description: 'APIs de RH (escopo a definir)', hoursMin: 60, hoursMax: 120, hourlyRate: 140, riskFactor: 1.5, costMin: 8400, costMax: 16800 },
      ],
    })
  }

  // Estimate READY com MEDIUM confidence
  const existingEstMedium = await prisma.estimate.findFirst({
    where: { projectId: projectCompleted.id, confidence: ConfidenceLevel.MEDIUM },
  })
  if (!existingEstMedium) {
    const estMedium = await prisma.estimate.create({
      data: {
        projectId: projectCompleted.id,
        createdBy: socio.id,
        version: 1,
        totalMin: 6800,
        totalMax: 9500,
        currency: 'BRL',
        confidence: ConfidenceLevel.MEDIUM,
        status: EstimateStatus.READY,
      },
    })

    await prisma.estimateItem.createMany({
      data: [
        { estimateId: estMedium.id, category: 'frontend-page', description: 'Landing page + 3 seções', hoursMin: 32, hoursMax: 45, hourlyRate: 160, riskFactor: 1.0, costMin: 5120, costMax: 7200 },
        { estimateId: estMedium.id, category: 'devops', description: 'Deploy Vercel + domínio', hoursMin: 8, hoursMax: 14, hourlyRate: 210, riskFactor: 1.0, costMin: 1680, costMax: 2940 },
      ],
    })
  }

  // Estimate ARCHIVED (versão anterior substituída)
  const existingEstArchived = await prisma.estimate.findFirst({
    where: { projectId: project1.id, status: EstimateStatus.ARCHIVED },
  })
  if (!existingEstArchived) {
    await prisma.estimate.create({
      data: {
        projectId: project1.id,
        createdBy: pm.id,
        version: 0,
        totalMin: 12000,
        totalMax: 18000,
        currency: 'BRL',
        confidence: ConfidenceLevel.LOW,
        status: EstimateStatus.ARCHIVED,
        aiRawResponse: '{"archived":true,"reason":"Substituída pela v1 após aprovação do escopo"}',
      },
    })
  }

  console.log('  ✓ EstimateStatus: GENERATING, ARCHIVED | ConfidenceLevel: LOW, MEDIUM')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 6 — Tasks com todos os status e prioridades
  // Cobre: TaskStatus (REVIEW, BLOCKED) + TaskPriority (P0, P1, P3)
  // ══════════════════════════════════════════════════════════════════════════

  const existingReviewTask = await prisma.task.findFirst({
    where: { projectId: project1.id, status: TaskStatus.REVIEW },
  })
  if (!existingReviewTask) {
    await prisma.task.createMany({
      data: [
        {
          projectId: project1.id,
          assigneeId: dev.id,
          createdBy: pm.id,
          title: 'Code review: módulo de produtos',
          description: 'Revisão do código do módulo de catálogo de produtos antes do merge.',
          status: TaskStatus.REVIEW,
          priority: TaskPriority.P1,
          estimatedHours: 4,
          position: 10,
          labels: ['code-review', 'frontend'],
        },
        {
          projectId: project1.id,
          assigneeId: dev.id,
          createdBy: pm.id,
          title: 'Integração com Stripe — aguardando credenciais do cliente',
          description: 'Bloqueado: cliente não forneceu as chaves de produção do Stripe.',
          status: TaskStatus.BLOCKED,
          priority: TaskPriority.P0,
          estimatedHours: 16,
          position: 11,
          labels: ['bloqueado', 'pagamento', 'p0'],
          scopeStatus: 'BLOCKED_EXTERNAL',
        },
        {
          projectId: project1.id,
          assigneeId: pm.id,
          createdBy: socio.id,
          title: '[P3] Documentar processo de onboarding',
          description: 'Baixa prioridade — criar documentação técnica de onboarding de novos devs.',
          status: TaskStatus.TODO,
          priority: TaskPriority.P3,
          estimatedHours: 6,
          position: 12,
          labels: ['documentação', 'low-priority'],
        },
        {
          projectId: project1.id,
          assigneeId: dev.id,
          createdBy: pm.id,
          title: 'Otimização de queries do dashboard',
          description: 'P1: queries lentas identificadas no profiling — impacto na UX.',
          status: TaskStatus.TODO,
          priority: TaskPriority.P1,
          estimatedHours: 8,
          position: 13,
          dueDate: daysFromNow(5),
          labels: ['performance', 'backend'],
        },
      ],
    })
  }

  // ScopeValidation para tasks com outros resultados
  const reviewTask = await prisma.task.findFirst({ where: { projectId: project1.id, status: TaskStatus.REVIEW } })
  const blockedTask = await prisma.task.findFirst({ where: { projectId: project1.id, status: TaskStatus.BLOCKED } })

  if (reviewTask) {
    const existingSVReview = await prisma.scopeValidation.findFirst({ where: { taskId: reviewTask.id } })
    if (!existingSVReview) {
      await prisma.scopeValidation.create({
        data: {
          taskId: reviewTask.id,
          result: ScopeResult.PARTIAL,
          similarityScore: 0.61,
          reasoning: 'Task parcialmente alinhada — revisão de código está implícita no escopo mas não explícita.',
          matchedRequirements: ['REQ-003'],
        },
      })
    }
  }

  if (blockedTask) {
    const existingSVBlocked = await prisma.scopeValidation.findFirst({ where: { taskId: blockedTask.id } })
    if (!existingSVBlocked) {
      await prisma.scopeValidation.create({
        data: {
          taskId: blockedTask.id,
          result: ScopeResult.VALID,
          similarityScore: 0.94,
          reasoning: 'Integração com gateway de pagamento está explicitamente definida no PRD, seção 3.2.',
          matchedRequirements: ['REQ-008', 'REQ-009'],
        },
      })
    }
  }

  // Tasks para projeto em REVIEW com INVALID e NEEDS_REVIEW
  const existingTasksForSV = await prisma.task.findFirst({
    where: { projectId: projectApproved.id },
  })
  if (!existingTasksForSV) {
    const taskInvalid = await prisma.task.create({
      data: {
        projectId: projectApproved.id,
        assigneeId: dev.id,
        createdBy: pm.id,
        title: 'Criar módulo de gamificação',
        description: 'Sugestão do dev — não consta no escopo aprovado do Portal RH.',
        status: TaskStatus.TODO,
        priority: TaskPriority.P2,
        position: 0,
      },
    })

    const taskNeedsReview = await prisma.task.create({
      data: {
        projectId: projectApproved.id,
        assigneeId: pm.id,
        createdBy: pm.id,
        title: 'Integrar com sistema legado de folha de pagamento',
        description: 'Mencionado pelo cliente na reunião — precisa de decisão formal.',
        status: TaskStatus.TODO,
        priority: TaskPriority.P1,
        position: 1,
      },
    })

    // ScopeResult INVALID
    await prisma.scopeValidation.create({
      data: {
        taskId: taskInvalid.id,
        result: ScopeResult.INVALID,
        similarityScore: 0.12,
        reasoning: 'Gamificação não consta em nenhum documento de escopo aprovado. Possível scope creep.',
        matchedRequirements: [],
      },
    })

    // ScopeResult NEEDS_REVIEW
    await prisma.scopeValidation.create({
      data: {
        taskId: taskNeedsReview.id,
        result: ScopeResult.NEEDS_REVIEW,
        similarityScore: 0.48,
        reasoning: 'Integração com folha de pagamento tem menção ambígua no PRD. Requer confirmação do PM.',
        matchedRequirements: ['REQ-AMBIGUOUS-01'],
      },
    })
  }

  console.log('  ✓ TaskStatus: REVIEW, BLOCKED | TaskPriority: P0, P1, P3 | ScopeResult: INVALID, PARTIAL, NEEDS_REVIEW')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 7 — ScopeAlerts com todos os tipos e status
  // Cobre: ScopeAlertType (OUT_OF_SCOPE, DUPLICATE), AlertStatus (ACKNOWLEDGED, DISMISSED), AlertTier completo
  // ══════════════════════════════════════════════════════════════════════════

  const taskForAlert = await prisma.task.findFirst({ where: { projectId: projectApproved.id } })

  if (taskForAlert) {
    const alertDefs = [
      {
        type: ScopeAlertType.OUT_OF_SCOPE,
        severity: AlertTier.HIGH,
        status: AlertStatus.OPEN,
        description: 'Tarefa de gamificação criada fora do escopo aprovado — risco de mudança não autorizada.',
        aiRationale: 'Similaridade com PRD: 12%. Nenhum requisito relacionado a gamificação identificado.',
      },
      {
        type: ScopeAlertType.DUPLICATE,
        severity: AlertTier.LOW,
        status: AlertStatus.ACKNOWLEDGED,
        description: 'Possible duplicate: "Integrar com sistema legado" pode sobrepor US-042 do PRD.',
        aiRationale: 'Similaridade > 70% com requisito RF-015. Recomenda-se merge das tasks.',
      },
      {
        type: ScopeAlertType.SCOPE_CREEP,
        severity: AlertTier.CRITICAL,
        status: AlertStatus.DISMISSED,
        description: 'Volume de mudanças não planejadas ultrapassa 30% do escopo original — projeto em risco.',
        aiRationale: '3 COs aprovados + 2 tasks fora de escopo = impacto acumulado de 35% no cronograma.',
        dismissedBy: socio.id,
        dismissReason: 'Cliente ciente dos riscos e autorizou formalmente via Change Order CO-003.',
      },
    ]

    for (const def of alertDefs) {
      const existing = await prisma.scopeAlert.findFirst({
        where: { projectId: projectApproved.id, type: def.type, status: def.status },
      })
      if (!existing) {
        await prisma.scopeAlert.create({
          data: {
            projectId: projectApproved.id,
            taskId: taskForAlert.id,
            type: def.type,
            severity: def.severity,
            description: def.description,
            aiRationale: def.aiRationale,
            status: def.status,
            dismissedBy: def.dismissedBy,
            dismissedAt: def.status === AlertStatus.DISMISSED ? daysAgo(1) : undefined,
            dismissReason: def.dismissReason,
          },
        })
      }
    }

    // AlertTier faltantes (LOW e CRITICAL no projeto existente também)
    const alertLowForProject1 = await prisma.scopeAlert.findFirst({
      where: { projectId: project1.id, severity: AlertTier.LOW },
    })
    const taskForAlertP1 = await prisma.task.findFirst({ where: { projectId: project1.id } })
    if (!alertLowForProject1 && taskForAlertP1) {
      await prisma.scopeAlert.create({
        data: {
          projectId: project1.id,
          taskId: taskForAlertP1.id,
          type: ScopeAlertType.DUPLICATE,
          severity: AlertTier.LOW,
          description: 'Possível duplicidade: task de testes pode sobrepor task de QA já existente.',
          aiRationale: 'Similaridade de 68% entre tasks de testes manuais e automáticos.',
          status: AlertStatus.ACKNOWLEDGED,
        },
      })
    }

    const alertCriticalForProject1 = await prisma.scopeAlert.findFirst({
      where: { projectId: project1.id, severity: AlertTier.CRITICAL },
    })
    if (!alertCriticalForProject1 && taskForAlertP1) {
      await prisma.scopeAlert.create({
        data: {
          projectId: project1.id,
          taskId: taskForAlertP1.id,
          type: ScopeAlertType.SCOPE_CREEP,
          severity: AlertTier.CRITICAL,
          description: 'CRÍTICO: 4 features não planejadas adicionadas na sprint — impacto direto no prazo de entrega.',
          aiRationale: 'Desvio acumulado estimado: +40h. Probabilidade de atraso: 87%.',
          status: AlertStatus.OPEN,
        },
      })
    }

    const alertHighForProject1 = await prisma.scopeAlert.findFirst({
      where: { projectId: project1.id, severity: AlertTier.HIGH },
    })
    if (!alertHighForProject1 && taskForAlertP1) {
      await prisma.scopeAlert.create({
        data: {
          projectId: project1.id,
          taskId: taskForAlertP1.id,
          type: ScopeAlertType.OUT_OF_SCOPE,
          severity: AlertTier.HIGH,
          description: 'Feature de relatórios avançados solicitada pelo cliente fora do escopo do contrato.',
          aiRationale: 'Nenhuma menção a relatórios no PRD aprovado. Recomenda-se emitir Change Order.',
          status: AlertStatus.OPEN,
        },
      })
    }
  }

  console.log('  ✓ ScopeAlertType: OUT_OF_SCOPE, DUPLICATE | AlertStatus: ACKNOWLEDGED, DISMISSED | AlertTier: LOW, HIGH, CRITICAL')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 8 — ChangeOrders com todos os status
  // Cobre: SENT, PENDING_APPROVAL, APPROVED, REJECTED, EXPIRED
  // ══════════════════════════════════════════════════════════════════════════

  const coDefs = [
    {
      slug: 'co-sent',
      title: 'CO-002 — Integração com sistema de NF-e',
      description: 'Cliente solicitou integração com emissão de notas fiscais — não estava no escopo original.',
      status: ChangeOrderStatus.SENT,
      impactTier: AlertTier.HIGH,
      hoursImpact: 40,
      costImpact: 8400,
      sentAt: daysAgo(2),
      slaDeadline: daysFromNow(5),
    },
    {
      slug: 'co-pending-approval',
      title: 'CO-003 — Painel de analytics avançado',
      description: 'Dashboard com métricas de vendas em tempo real — solicitação da diretoria.',
      status: ChangeOrderStatus.PENDING_APPROVAL,
      impactTier: AlertTier.MEDIUM,
      hoursImpact: 24,
      costImpact: 5040,
      sentAt: daysAgo(1),
      slaDeadline: daysFromNow(3),
    },
    {
      slug: 'co-approved',
      title: 'CO-004 — Exportação de dados em CSV',
      description: 'Feature de exportação de pedidos e clientes em CSV para auditoria.',
      status: ChangeOrderStatus.APPROVED,
      impactTier: AlertTier.LOW,
      hoursImpact: 8,
      costImpact: 1680,
      sentAt: daysAgo(10),
      resolvedAt: daysAgo(7),
      approvedBy: socio.id,
      approvedAt: daysAgo(7),
    },
    {
      slug: 'co-rejected',
      title: 'CO-005 — App mobile complementar',
      description: 'Cliente solicitou app mobile React Native como complemento ao e-commerce.',
      status: ChangeOrderStatus.REJECTED,
      impactTier: AlertTier.CRITICAL,
      hoursImpact: 200,
      costImpact: 42000,
      sentAt: daysAgo(15),
      resolvedAt: daysAgo(12),
      rejectedBy: socio.id,
      rejectedAt: daysAgo(12),
      rejectionReason: 'Impacto financeiro inviável para o orçamento atual. Sugerido como projeto separado.',
    },
    {
      slug: 'co-expired',
      title: 'CO-006 — Integração com WhatsApp Business',
      description: 'Notificações automáticas de pedido via WhatsApp.',
      status: ChangeOrderStatus.EXPIRED,
      impactTier: AlertTier.MEDIUM,
      hoursImpact: 16,
      costImpact: 3360,
      sentAt: daysAgo(30),
      slaDeadline: daysAgo(23),
    },
  ]

  const coIds: string[] = []
  for (const def of coDefs) {
    const existing = await prisma.changeOrder.findFirst({
      where: { projectId: project1.id, title: def.title },
    })
    if (!existing) {
      const co = await prisma.changeOrder.create({
        data: {
          projectId: project1.id,
          createdBy: pm.id,
          title: def.title,
          description: def.description,
          status: def.status,
          impactTier: def.impactTier,
          hoursImpact: def.hoursImpact,
          costImpact: def.costImpact,
          sentAt: def.sentAt,
          slaDeadline: def.slaDeadline,
          resolvedAt: def.resolvedAt,
          approvedBy: def.approvedBy,
          approvedAt: def.approvedAt,
          rejectedBy: def.rejectedBy,
          rejectedAt: def.rejectedAt,
          rejectionReason: def.rejectionReason,
        },
      })
      coIds.push(co.id)
    }
  }

  // ChangeOrderTask — associar CO APPROVED a tasks do projeto
  const coApproved = await prisma.changeOrder.findFirst({
    where: { projectId: project1.id, status: ChangeOrderStatus.APPROVED },
  })
  const taskForCO = await prisma.task.findFirst({ where: { projectId: project1.id, status: TaskStatus.DONE } })
  if (coApproved && taskForCO) {
    const existingCOTask = await prisma.changeOrderTask.findFirst({
      where: { changeOrderId: coApproved.id, taskId: taskForCO.id },
    })
    if (!existingCOTask) {
      await prisma.changeOrderTask.create({
        data: { changeOrderId: coApproved.id, taskId: taskForCO.id },
      })
    }
  }

  console.log('  ✓ ChangeOrderStatus: SENT, PENDING_APPROVAL, APPROVED, REJECTED, EXPIRED + ChangeOrderTask')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 9 — ProfitReport com todos os PeriodType
  // Cobre: WEEKLY, MONTHLY
  // ══════════════════════════════════════════════════════════════════════════

  const weekStart = daysAgo(7)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = daysAgo(1)
  weekEnd.setHours(23, 59, 59, 999)

  const existingWeeklyReport = await prisma.profitReport.findFirst({
    where: { projectId: project1.id, period: PeriodType.WEEKLY },
  })
  if (!existingWeeklyReport) {
    await prisma.profitReport.create({
      data: {
        projectId: project1.id,
        period: PeriodType.WEEKLY,
        periodStart: weekStart,
        periodEnd: weekEnd,
        revenue: 0,
        cost: 2560,
        margin: -2560,
        marginPct: -100,
        hoursLogged: 16,
        billableHours: 16,
        teamCosts: [
          { userId: dev.id, userName: 'Carlos Dev', role: 'DEV', hours: 8, billableHours: 8, effectiveRate: 160, rateSource: 'role-config', cost: 1280, pctOfTotal: 50 },
          { userId: dev.id, userName: 'Carlos Dev', role: 'DEV', hours: 8, billableHours: 8, effectiveRate: 160, rateSource: 'role-config', cost: 1280, pctOfTotal: 50 },
        ],
        idempotencyKey: `weekly-${project1.id}-${weekStart.toISOString().split('T')[0]}`,
      },
    })
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date()
  monthEnd.setHours(23, 59, 59, 999)

  const existingMonthlyReport = await prisma.profitReport.findFirst({
    where: { projectId: project1.id, period: PeriodType.MONTHLY },
  })
  if (!existingMonthlyReport) {
    await prisma.profitReport.create({
      data: {
        projectId: project1.id,
        period: PeriodType.MONTHLY,
        periodStart: monthStart,
        periodEnd: monthEnd,
        revenue: 45000,
        cost: 5200,
        margin: 39800,
        marginPct: 88.44,
        hoursLogged: 36,
        billableHours: 32,
        teamCosts: [
          { userId: dev.id, userName: 'Carlos Dev', role: 'DEV', hours: 24, billableHours: 24, effectiveRate: 160, rateSource: 'role-config', cost: 3840, pctOfTotal: 73.8 },
          { userId: pm.id, userName: 'Ana PM', role: 'PM', hours: 12, billableHours: 8, effectiveRate: 170, rateSource: 'project-config', cost: 1360, pctOfTotal: 26.2 },
        ],
        aiInsights: 'Margem de 88.44% está acima da meta de 80%. Risco principal: CO-002 pode reduzir margem em 10pp se aprovado.',
        idempotencyKey: `monthly-${project1.id}-${monthStart.toISOString().split('T')[0]}`,
      },
    })
  }

  console.log('  ✓ PeriodType: WEEKLY, MONTHLY')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 10 — ClientAccess com todos os status
  // Cobre: ACTIVE, REVOKED
  // ══════════════════════════════════════════════════════════════════════════

  const existingActiveAccess = await prisma.clientAccess.findFirst({
    where: { projectId: project1.id, status: ClientAccessStatus.ACTIVE },
  })
  if (!existingActiveAccess) {
    const activeAccess = await prisma.clientAccess.create({
      data: {
        projectId: project1.id,
        clientEmail: 'diretora@cliente-ecommerce.com',
        clientName: 'Maria Diretora',
        inviteToken: `active-token-${project1.id}-maria`,
        status: ClientAccessStatus.ACTIVE,
        invitedBy: pm.id,
        acceptedAt: daysAgo(5),
        expiresAt: daysFromNow(30),
      },
    })

    // ApprovalHistory para o acesso ativo
    const approvalReqForActive = await prisma.approvalRequest.create({
      data: {
        projectId: project1.id,
        clientAccessId: activeAccess.id,
        requestedBy: pm.id,
        type: 'MILESTONE',
        title: 'Aprovação do Milestone M1 — MVP do catálogo',
        description: 'O MVP do catálogo de produtos foi concluído. Aguardando aprovação formal para liberar próxima fase.',
        status: 'APPROVED',
        slaDeadline: daysAgo(3),
        respondedAt: daysAgo(4),
      },
    })

    await prisma.approvalHistory.createMany({
      data: [
        {
          approvalRequestId: approvalReqForActive.id,
          action: 'CREATED',
          comment: null,
          actorId: pm.id,
          createdAt: daysAgo(5),
        },
        {
          approvalRequestId: approvalReqForActive.id,
          action: 'REMINDER_SENT',
          comment: 'Lembrete automático enviado após 24h sem resposta.',
          actorId: null,
          createdAt: daysAgo(5),
        },
        {
          approvalRequestId: approvalReqForActive.id,
          action: 'APPROVED',
          comment: 'Catálogo aprovado com ressalvas: adicionar filtro por preço na próxima sprint.',
          actorId: null,
          createdAt: daysAgo(4),
        },
      ],
    })

    // ApprovalLog no documento PRD
    const prdDoc = await prisma.document.findFirst({
      where: { projectId: project1.id, type: DocumentType.PRD, status: DocumentStatus.APPROVED },
    })
    if (prdDoc) {
      await prisma.approvalLog.create({
        data: {
          documentId: prdDoc.id,
          versionNumber: 1,
          userId: socio.id,
          action: ApprovalAction.APPROVED,
          comment: 'PRD aprovado. Iniciar desenvolvimento na próxima semana.',
          ipAddress: '192.168.1.100',
        },
      })

      await prisma.approvalLog.create({
        data: {
          documentId: prdDoc.id,
          versionNumber: 1,
          userId: pm.id,
          action: ApprovalAction.CLARIFICATION_REQUESTED,
          comment: 'Seção de integrações precisa de mais detalhes sobre autenticação OAuth.',
          ipAddress: '192.168.1.101',
        },
      })
    }

    // ClientFeedback
    await prisma.clientFeedback.create({
      data: {
        projectId: project1.id,
        clientAccessId: activeAccess.id,
        content: 'O catálogo ficou ótimo! Apenas sugestão: filtro por preço seria muito útil.',
        category: 'APPROVAL',
      },
    })

    await prisma.clientFeedback.create({
      data: {
        projectId: project1.id,
        clientAccessId: activeAccess.id,
        content: 'Preocupação com o prazo do checkout — o prazo parece apertado.',
        category: 'CONCERN',
      },
    })
  }

  // ClientAccess REVOKED — acesso revogado por segurança
  const existingRevokedAccess = await prisma.clientAccess.findFirst({
    where: { projectId: projectArchived.id, status: ClientAccessStatus.REVOKED },
  })
  if (!existingRevokedAccess) {
    await prisma.clientAccess.create({
      data: {
        projectId: projectArchived.id,
        clientEmail: 'ex-cliente@exemplo.com',
        clientName: 'Contato Anterior',
        inviteToken: `revoked-token-${projectArchived.id}`,
        status: ClientAccessStatus.REVOKED,
        invitedBy: pm.id,
        acceptedAt: daysAgo(60),
        revokedAt: daysAgo(10),
        expiresAt: daysAgo(10),
      },
    })
  }

  console.log('  ✓ ClientAccessStatus: ACTIVE, REVOKED + ApprovalHistory + ApprovalLog + ClientFeedback')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 11 — RAGIndex com todos os status de indexação
  // Cobre: IndexationStatus (IN_PROGRESS, COMPLETE, FAILED)
  // ══════════════════════════════════════════════════════════════════════════

  // RAGIndex IN_PROGRESS
  await prisma.rAGIndex.upsert({
    where: { projectId: projectApproved.id },
    update: {},
    create: {
      projectId: projectApproved.id,
      githubRepoUrl: 'https://github.com/project-forge-org/portal-rh',
      githubOwner: 'project-forge-org',
      githubRepo: 'portal-rh',
      indexationStatus: IndexationStatus.IN_PROGRESS,
      indexedExtensions: ['.ts', '.tsx', '.md', '.sql'],
      totalChunks: 0,
      lastIndexedAt: daysAgo(1),
    },
  })

  // RAGIndex COMPLETE
  await prisma.rAGIndex.upsert({
    where: { projectId: projectCompleted.id },
    update: {},
    create: {
      projectId: projectCompleted.id,
      githubRepoUrl: 'https://github.com/project-forge-org/landing-page-v2',
      githubOwner: 'project-forge-org',
      githubRepo: 'landing-page-v2',
      lastCommitSha: 'a1b2c3d4e5f6789012345678901234567890abcd',
      indexationStatus: IndexationStatus.COMPLETE,
      indexedExtensions: ['.tsx', '.css', '.md'],
      totalChunks: 48,
      lastIndexedAt: daysAgo(3),
    },
  })

  // RAGIndex FAILED
  await prisma.rAGIndex.upsert({
    where: { projectId: projectArchived.id },
    update: {},
    create: {
      projectId: projectArchived.id,
      githubRepoUrl: 'https://github.com/project-forge-org/app-legado',
      githubOwner: 'project-forge-org',
      githubRepo: 'app-legado',
      indexationStatus: IndexationStatus.FAILED,
      indexedExtensions: ['.ts'],
      totalChunks: 0,
      lastIndexedAt: daysAgo(15),
    },
  })

  // RAGQuery no RAGIndex COMPLETE
  const ragComplete = await prisma.rAGIndex.findFirst({ where: { projectId: projectCompleted.id } })
  if (ragComplete) {
    const existingQuery = await prisma.rAGQuery.findFirst({ where: { ragIndexId: ragComplete.id } })
    if (!existingQuery) {
      await prisma.rAGQuery.create({
        data: {
          ragIndexId: ragComplete.id,
          userId: dev.id,
          query: 'Como funciona o componente de hero da landing page?',
          answer: 'O Hero utiliza um componente React chamado `HeroSection` localizado em `src/components/Hero.tsx`. Ele aceita props de título, subtítulo e CTA...',
          sources: [
            { path: '/src/components/Hero.tsx', similarity: 0.92 },
            { path: '/src/app/page.tsx', similarity: 0.78 },
          ],
          tokensUsed: 847,
          provider: 'anthropic',
          latencyMs: 1240,
        },
      })
    }
  }

  // GitHubSync
  const existingGitSync = await prisma.gitHubSync.findFirst({ where: { projectId: project1.id } })
  if (!existingGitSync) {
    await prisma.gitHubSync.create({
      data: {
        projectId: project1.id,
        installationId: 'gh-install-001-dev',
        repoOwner: 'project-forge-org',
        repoName: 'ecommerce-redesign',
        syncStatus: 'IDLE',
        lastWebhookAt: daysAgo(1),
      },
    })
  }

  console.log('  ✓ IndexationStatus: IN_PROGRESS, COMPLETE, FAILED + RAGQuery + GitHubSync')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 12 — Notifications com todos os canais e prioridades
  // Cobre: NotificationChannel (EMAIL), NotificationPriority (LOW, URGENT)
  // ══════════════════════════════════════════════════════════════════════════

  const existingEmailNotif = await prisma.notification.findFirst({
    where: { userId: pm.id, channel: NotificationChannel.EMAIL },
  })
  if (!existingEmailNotif) {
    await prisma.notification.createMany({
      data: [
        {
          userId: pm.id,
          projectId: project1.id,
          type: 'CO_APPROVED',
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.LOW,
          payload: { coId: 'co-001', title: 'CO-004 aprovado', hoursImpact: 8 },
          isRead: true,
          readAt: daysAgo(1),
        },
        {
          userId: socio.id,
          projectId: project1.id,
          type: 'SCOPE_CREEP_CRITICAL',
          channel: NotificationChannel.IN_APP,
          priority: NotificationPriority.URGENT,
          payload: { alertId: 'scope-critical', title: 'Alerta crítico de scope creep', deviationPct: 40 },
          isRead: false,
        },
        {
          userId: dev.id,
          projectId: project1.id,
          type: 'TASK_BLOCKED',
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.URGENT,
          payload: { taskId: 'blocked-001', reason: 'Aguardando credenciais do cliente' },
          isRead: false,
        },
        {
          userId: socio.id,
          projectId: projectCompleted.id,
          type: 'PROJECT_COMPLETED',
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.LOW,
          payload: { projectName: 'Landing Page v2', marginPct: 88.44 },
          isRead: true,
          readAt: daysAgo(5),
        },
      ],
    })
  }

  // NotificationPreference para todos os canais
  await prisma.notificationPreference.upsert({
    where: {
      userId_eventType_channel: {
        userId: socio.id,
        eventType: 'SCOPE_CREEP_CRITICAL',
        channel: NotificationChannel.EMAIL,
      },
    },
    update: {},
    create: {
      userId: socio.id,
      eventType: 'SCOPE_CREEP_CRITICAL',
      channel: NotificationChannel.EMAIL,
      enabled: true,
    },
  })

  await prisma.notificationPreference.upsert({
    where: {
      userId_eventType_channel: {
        userId: dev.id,
        eventType: 'TASK_BLOCKED',
        channel: NotificationChannel.EMAIL,
      },
    },
    update: {},
    create: {
      userId: dev.id,
      eventType: 'TASK_BLOCKED',
      channel: NotificationChannel.EMAIL,
      enabled: true,
    },
  })

  // NotificationPreference com enabled: false (usuário optou por sair)
  await prisma.notificationPreference.upsert({
    where: {
      userId_eventType_channel: {
        userId: dev.id,
        eventType: 'ESTIMATE_APPROVED',
        channel: NotificationChannel.EMAIL,
      },
    },
    update: {},
    create: {
      userId: dev.id,
      eventType: 'ESTIMATE_APPROVED',
      channel: NotificationChannel.EMAIL,
      enabled: false,
    },
  })

  console.log('  ✓ NotificationChannel: EMAIL | NotificationPriority: LOW, URGENT + NotificationPreference completo')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 13 — CostConfig + CostOverride
  // ══════════════════════════════════════════════════════════════════════════

  // CostConfig por role por projeto (projectApproved)
  for (const rate of [
    { role: UserRole.SOCIO, hourlyRate: 300 },
    { role: UserRole.PM, hourlyRate: 220 },
    { role: UserRole.DEV, hourlyRate: 180 },
  ]) {
    const existing = await prisma.costConfig.findFirst({
      where: { projectId: projectApproved.id, role: rate.role },
    })
    if (!existing) {
      const config = await prisma.costConfig.create({
        data: {
          projectId: projectApproved.id,
          createdById: socio.id,
          role: rate.role,
          hourlyRate: rate.hourlyRate,
          effectiveFrom: daysAgo(30),
        },
      })

      // CostOverride para o dev com tarifa customizada
      if (rate.role === UserRole.DEV) {
        const existingOverride = await prisma.costOverride.findFirst({
          where: { costConfigId: config.id, userId: dev.id },
        })
        if (!existingOverride) {
          await prisma.costOverride.create({
            data: {
              costConfigId: config.id,
              userId: dev.id,
              customRate: 200,
              reason: 'Desenvolvedor sênior com especialização em RH systems — tarifa acima do padrão da role.',
            },
          })
        }
      }
    }
  }

  // CostConfig com effectiveTo definido (expirado)
  const existingExpiredConfig = await prisma.costConfig.findFirst({
    where: { projectId: projectCompleted.id, role: UserRole.DEV },
  })
  if (!existingExpiredConfig) {
    await prisma.costConfig.create({
      data: {
        projectId: projectCompleted.id,
        createdById: socio.id,
        role: UserRole.DEV,
        hourlyRate: 120,
        effectiveFrom: daysAgo(90),
        effectiveTo: daysAgo(5),
      },
    })
  }

  console.log('  ✓ CostConfig + CostOverride')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 14 — InviteToken
  // ══════════════════════════════════════════════════════════════════════════

  const inviteTokenDefs = [
    {
      email: 'novo-dev@projectforge.app',
      role: UserRole.DEV,
      expiresAt: daysFromNow(7),
      usedAt: null,
    },
    {
      email: 'novo-pm@projectforge.app',
      role: UserRole.PM,
      expiresAt: daysFromNow(3),
      usedAt: null,
    },
    {
      email: 'ex-dev@projectforge.app',
      role: UserRole.DEV,
      expiresAt: daysAgo(1),
      usedAt: null,  // expirado sem uso — edge case
    },
    {
      email: 'dev2@projectforge.app',
      role: UserRole.DEV,
      expiresAt: daysFromNow(14),
      usedAt: daysAgo(2),  // convite aceito
    },
  ]

  for (const def of inviteTokenDefs) {
    const existing = await prisma.inviteToken.findFirst({ where: { email: def.email } })
    if (!existing) {
      await prisma.inviteToken.create({
        data: {
          email: def.email,
          role: def.role,
          expiresAt: def.expiresAt,
          usedAt: def.usedAt,
          createdBy: socio.id,
        },
      })
    }
  }

  console.log('  ✓ InviteToken: ativo, expirado, aceito')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 15 — AuditLog
  // ══════════════════════════════════════════════════════════════════════════

  const existingAuditLog = await prisma.auditLog.findFirst({ where: { userId: socio.id } })
  if (!existingAuditLog) {
    const estimate = await prisma.estimate.findFirst({ where: { projectId: project1.id, status: EstimateStatus.READY } })
    const coApprovedRec = await prisma.changeOrder.findFirst({ where: { status: ChangeOrderStatus.APPROVED } })

    const auditDefs = [
      {
        userId: socio.id,
        action: 'ESTIMATE_APPROVED',
        resourceType: 'estimate',
        resourceId: estimate?.id ?? project1.id,
        beforeState: { status: 'GENERATING' },
        afterState: { status: 'READY', confidence: 'HIGH' },
        ipAddress: '192.168.1.100',
      },
      {
        userId: pm.id,
        action: 'CHANGE_ORDER_CREATED',
        resourceType: 'change_order',
        resourceId: coApprovedRec?.id ?? project1.id,
        beforeState: Prisma.DbNull,
        afterState: { status: 'DRAFT', hoursImpact: 8 },
        ipAddress: '192.168.1.101',
      },
      {
        userId: socio.id,
        action: 'CLIENT_ACCESS_REVOKED',
        resourceType: 'client_access',
        resourceId: projectArchived.id,
        beforeState: { status: 'ACTIVE' },
        afterState: { status: 'REVOKED' },
        ipAddress: '192.168.1.100',
      },
      {
        userId: dev.id,
        action: 'TASK_STATUS_CHANGED',
        resourceType: 'task',
        resourceId: project1.id,
        beforeState: { status: 'TODO' },
        afterState: { status: 'DONE' },
        ipAddress: '192.168.1.102',
      },
    ]

    await prisma.auditLog.createMany({ data: auditDefs })
  }

  console.log('  ✓ AuditLog: 4 entradas de auditoria')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 16 — DocumentAccessLog
  // ══════════════════════════════════════════════════════════════════════════

  const prdForLog = await prisma.document.findFirst({
    where: { projectId: project1.id, type: DocumentType.PRD },
  })
  if (prdForLog) {
    const existingAccessLog = await prisma.documentAccessLog.findFirst({
      where: { documentId: prdForLog.id },
    })
    if (!existingAccessLog) {
      await prisma.documentAccessLog.createMany({
        data: [
          {
            documentId: prdForLog.id,
            accessedBy: pm.id,
            action: 'VIEW',
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh) Chrome/120',
          },
          {
            documentId: prdForLog.id,
            accessedBy: pm.id,
            action: 'EXPORT_MD',
            ipAddress: '192.168.1.101',
            userAgent: 'Mozilla/5.0 (Macintosh) Chrome/120',
          },
          {
            documentId: prdForLog.id,
            accessedBy: socio.id,
            action: 'VIEW',
            ipAddress: '192.168.1.100',
            userAgent: 'Mozilla/5.0 (Windows) Chrome/121',
          },
          {
            documentId: prdForLog.id,
            accessedBy: dev.id,
            action: 'EXPORT_PDF',
            ipAddress: '192.168.1.102',
            userAgent: 'Mozilla/5.0 (Linux) Firefox/121',
          },
        ],
      })
    }
  }

  console.log('  ✓ DocumentAccessLog: VIEW, EXPORT_MD, EXPORT_PDF')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 17 — EmailLog com todos os status
  // Cobre: PENDING, BOUNCED, COMPLAINED, FAILED
  // ══════════════════════════════════════════════════════════════════════════

  const emailLogDefs = [
    {
      to: 'novo-cliente@empresa.com',
      type: 'invite',
      projectId: projectApproved.id,
      subject: 'Convite para o Portal RH — Project Forge',
      status: 'PENDING',
      sentAt: null,
    },
    {
      to: 'email-invalido@dominio-inexistente.xyz',
      type: 'invite',
      projectId: project1.id,
      subject: 'Convite para o portal do projeto E-commerce Redesign',
      status: 'BOUNCED',
      sentAt: daysAgo(5),
      resendMessageId: 'dev-resend-bounce-001',
    },
    {
      to: 'usuario-spam@exemplo.com',
      type: 'notification',
      projectId: project1.id,
      subject: 'Aprovação pendente: PRD v1',
      status: 'COMPLAINED',
      sentAt: daysAgo(3),
      resendMessageId: 'dev-resend-complained-001',
    },
    {
      to: 'cliente-erro@dominio.com',
      type: 'approval_request',
      projectId: project1.id,
      subject: 'Ação necessária: Milestone M2 aguarda aprovação',
      status: 'FAILED',
      sentAt: null,
    },
  ]

  for (const def of emailLogDefs) {
    const existing = await prisma.emailLog.findFirst({
      where: { to: def.to, type: def.type, projectId: def.projectId },
    })
    if (!existing) {
      await prisma.emailLog.create({ data: def })
    }
  }

  console.log('  ✓ EmailLog: PENDING, BOUNCED, COMPLAINED, FAILED')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 18 — ProjectCostRates para projetos restantes
  // ══════════════════════════════════════════════════════════════════════════

  for (const project of [projectCompleted, projectApproved]) {
    for (const rate of [
      { role: UserRole.SOCIO, hourlyRate: 250 },
      { role: UserRole.PM, hourlyRate: 180 },
      { role: UserRole.DEV, hourlyRate: 140 },
    ]) {
      await prisma.projectCostRate.upsert({
        where: { projectId_role: { projectId: project.id, role: rate.role } },
        update: {},
        create: { projectId: project.id, role: rate.role, hourlyRate: rate.hourlyRate, currency: 'BRL' },
      })
    }
  }

  console.log('  ✓ ProjectCostRates para projectCompleted e projectApproved')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 19 — ScopeBaseline para projetos adicionais + Checkpoint
  // ══════════════════════════════════════════════════════════════════════════

  const estForBaseline = await prisma.estimate.findFirst({
    where: { projectId: projectCompleted.id, status: EstimateStatus.READY },
  })
  const existingBaselineCompleted = await prisma.scopeBaseline.findFirst({
    where: { projectId: projectCompleted.id },
  })
  if (!existingBaselineCompleted && estForBaseline) {
    await prisma.scopeBaseline.create({
      data: {
        projectId: projectCompleted.id,
        estimateId: estForBaseline.id,
        createdBy: pm.id,
        name: 'Baseline Final — Landing Page v2',
        description: 'Snapshot do escopo no momento da entrega final.',
        tasks: [
          { title: 'Design das seções hero, features e CTA', status: 'DONE' },
          { title: 'Implementação responsiva', status: 'DONE' },
          { title: 'Deploy Vercel com domínio customizado', status: 'DONE' },
        ],
        features: [
          { name: 'Landing page responsiva', priority: 'HIGH', status: 'DONE' },
          { name: 'Formulário de contato', priority: 'MEDIUM', status: 'DONE' },
        ],
        taskCount: 3,
      },
    })
  }

  const existingCheckpointCompleted = await prisma.checkpoint.findFirst({
    where: { projectId: projectCompleted.id },
  })
  if (!existingCheckpointCompleted) {
    await prisma.checkpoint.create({
      data: {
        projectId: projectCompleted.id,
        name: 'Checkpoint Final — Entrega aprovada',
        snapshotData: {
          period: 'FULL',
          capturedAt: daysAgo(5).toISOString(),
          revenue: 8500,
          cost: 1200,
          margin: 7300,
          marginPct: 85.88,
          hoursLogged: 40,
          billableHours: 40,
          billableRatio: 100,
          teamCosts: [{ role: 'DEV', hours: 40, cost: 1200 }],
          burnRate: { daysElapsed: 55, daysRemaining: 0, costPerDay: 21.82, projectedTotalCost: 1200, projectedMargin: 7300, projectedMarginPct: 85.88, isOverBudget: false },
        },
      },
    })
  }

  console.log('  ✓ ScopeBaseline e Checkpoint para projectCompleted')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 20 — TimesheetEntries adicionais (billable: false, deletedAt)
  // ══════════════════════════════════════════════════════════════════════════

  const existingNonBillable = await prisma.timesheetEntry.findFirst({
    where: { projectId: project1.id, billable: false },
  })
  if (!existingNonBillable) {
    await prisma.timesheetEntry.createMany({
      data: [
        {
          projectId: project1.id,
          userId: pm.id,
          role: UserRole.PM,
          hours: 2,
          workDate: daysAgo(3),
          description: 'Call interna de alinhamento de time — não faturável',
          billable: false,
        },
        {
          projectId: project1.id,
          userId: dev.id,
          role: UserRole.DEV,
          hours: 1.5,
          workDate: daysAgo(2),
          description: 'Setup de ambiente de desenvolvimento — não faturável ao cliente',
          billable: false,
        },
        {
          projectId: project1.id,
          userId: dev.id,
          role: UserRole.DEV,
          hours: 4,
          workDate: daysAgo(7),
          description: 'Entrada deletada por erro de registro',
          billable: true,
          deletedAt: daysAgo(6),  // soft delete — edge case
        },
      ],
    })
  }

  console.log('  ✓ TimesheetEntry: billable=false, soft-deleted')

  // ══════════════════════════════════════════════════════════════════════════
  // BLOCO 21 — Events adicionais (tipos variados + processedAt null)
  // ══════════════════════════════════════════════════════════════════════════

  const existingEventsExtended = await prisma.event.findFirst({
    where: { projectId: project1.id, type: 'CHANGE_ORDER_APPROVED' },
  })
  if (!existingEventsExtended) {
    await prisma.event.createMany({
      data: [
        {
          projectId: project1.id,
          type: 'CHANGE_ORDER_APPROVED',
          payload: { coId: 'co-004', hoursImpact: 8, costImpact: 1680 },
          sourceModule: 'co-manager',
          processedAt: daysAgo(7),
        },
        {
          projectId: project1.id,
          type: 'SCOPE_CREEP_DETECTED',
          payload: { alertId: 'alert-critical-001', severity: 'CRITICAL', deviationPct: 40 },
          sourceModule: 'scope-shield',
          processedAt: null,  // evento não processado ainda — edge case
        },
        {
          projectId: project1.id,
          type: 'CLIENT_FEEDBACK_RECEIVED',
          payload: { category: 'APPROVAL', content: 'O catálogo ficou ótimo!' },
          sourceModule: 'client-portal',
          processedAt: daysAgo(5),
        },
        {
          projectId: projectCompleted.id,
          type: 'PROJECT_COMPLETED',
          payload: { completedAt: daysAgo(5).toISOString(), finalMarginPct: 85.88 },
          sourceModule: 'project-manager',
          processedAt: daysAgo(5),
        },
      ],
    })
  }

  console.log('  ✓ Events: CHANGE_ORDER_APPROVED, SCOPE_CREEP_DETECTED, CLIENT_FEEDBACK_RECEIVED, PROJECT_COMPLETED')

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMO FINAL
  // ══════════════════════════════════════════════════════════════════════════

  console.log('\n  📦 Dev Extended concluído:')
  console.log('  ✓ 4 projetos novos (ESTIMATION, APPROVED, COMPLETED, ARCHIVED)')
  console.log('  ✓ Cobertura completa de enums: ProjectStatus(6/6), DocumentStatus(5/5), DocumentType(4/4)')
  console.log('  ✓ EstimateStatus(3/3), ConfidenceLevel(3/3), TaskStatus(5/5), TaskPriority(4/4)')
  console.log('  ✓ ScopeResult(4/4), ScopeAlertType(3/3), AlertStatus(3/3), AlertTier(4/4)')
  console.log('  ✓ ChangeOrderStatus(6/6), BriefStatus(3/3), SessionStatus(3/3), PRDStatus(3/3)')
  console.log('  ✓ PeriodType(3/3), ClientAccessStatus(3/3), IndexationStatus(4/4)')
  console.log('  ✓ NotificationPriority(4/4), NotificationChannel(2/2)')
  console.log('  ✓ Entidades novas: PRDDocument, InviteToken, AuditLog, ApprovalLog, ApprovalHistory')
  console.log('  ✓ Entidades novas: ClientFeedback, DocumentAccessLog, CostConfig, CostOverride')
  console.log('  ✓ Entidades novas: ChangeOrderTask, GitHubSync, RAGQuery')
  console.log('  ✓ Edge cases: entrevista interrompida, PRD gerando, task bloqueada, soft-delete timesheet, evento não processado')
}
