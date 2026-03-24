/**
 * Factories tipadas para testes
 * Uso: await prisma.user.create({ data: userFactory() })
 */
import {
  UserRole,
  ProjectStatus,
  DocumentStatus,
  DocumentType,
  EstimateStatus,
  TaskStatus,
  ChangeOrderStatus,
  AlertTier,
  IndexationStatus,
  ScopeResult,
  ApprovalAction,
  NotificationChannel,
  NotificationPriority,
} from '@prisma/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

let _counter = 0
const uid = () => `test-${Date.now()}-${++_counter}`

// ── User ──────────────────────────────────────────────────────────────────────

interface UserFactoryInput {
  organizationId: string
  email?: string
  name?: string
  role?: UserRole
  id?: string
  avatarUrl?: string | null
  mfaEnabled?: boolean
}

export const userFactory = (overrides: UserFactoryInput) => ({
  id: overrides.id ?? uid(),
  organizationId: overrides.organizationId,
  email: overrides.email ?? `user-${uid()}@test.com`,
  name: overrides.name ?? 'Test User',
  role: overrides.role ?? UserRole.PM,
  avatarUrl: overrides.avatarUrl ?? null,
  mfaEnabled: overrides.mfaEnabled ?? false,
  consentGivenAt: null,
  dataRetentionUntil: null,
})

// ── Project ───────────────────────────────────────────────────────────────────

export const projectFactory = (organizationId: string, overrides: Record<string, unknown> = {}) => ({
  organizationId,
  name: `Projeto Teste ${uid()}`,
  slug: `projeto-teste-${uid()}`,
  status: ProjectStatus.BRIEFING,
  revenue: null,
  currency: 'BRL',
  description: 'Projeto gerado por factory para testes',
  ...overrides,
})

// ── Brief ─────────────────────────────────────────────────────────────────────

export const briefFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  answers: {},
  aiContext: {},
  isComplete: false,
  ...overrides,
})

// ── BriefSession ──────────────────────────────────────────────────────────────

export const briefSessionFactory = (briefId: string, overrides: Record<string, unknown> = {}) => ({
  briefId,
  status: 'ACTIVE',
  transcript: [],
  resumeToken: null,
  completedAt: null,
  ...overrides,
})

// ── Document ──────────────────────────────────────────────────────────────────

export const documentFactory = (projectId: string, createdBy: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  createdBy,
  type: DocumentType.PRD,
  title: `Documento de Teste ${uid()}`,
  status: DocumentStatus.DRAFT,
  currentVersion: 1,
  slaDeadline: null,
  ...overrides,
})

// ── Estimate ──────────────────────────────────────────────────────────────────

export const estimateFactory = (projectId: string, createdBy: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  createdBy,
  version: 1,
  totalMin: 100,
  totalMax: 150,
  currency: 'BRL',
  confidence: 'LOW' as const,
  status: EstimateStatus.GENERATING,
  ...overrides,
})

// ── EstimateItem ──────────────────────────────────────────────────────────────

export const estimateItemFactory = (estimateId: string, overrides: Record<string, unknown> = {}) => ({
  estimateId,
  category: 'frontend-component',
  description: `Item de teste ${uid()}`,
  hoursMin: 20,
  hoursMax: 30,
  hourlyRate: 100,
  riskFactor: 1.0,
  costMin: 2000,
  costMax: 3000,
  ...overrides,
})

// ── Task ──────────────────────────────────────────────────────────────────────

export const taskFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  assigneeId: null,
  title: `Task ${uid()}`,
  description: 'Task gerada por factory para testes',
  status: TaskStatus.TODO,
  estimatedHours: null,
  position: 0,
  scopeStatus: null,
  ...overrides,
})

// ── ChangeOrder ───────────────────────────────────────────────────────────────

export const changeOrderFactory = (projectId: string, createdBy: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  createdBy,
  title: `Change Order ${uid()}`,
  description: 'Mudança de escopo gerada por factory',
  status: ChangeOrderStatus.DRAFT,
  impactTier: AlertTier.MEDIUM,
  hoursImpact: 10,
  costImpact: 1500,
  scopeImpact: 'Descritivo do impacto no escopo',
  documentId: null,
  sentAt: null,
  resolvedAt: null,
  slaDeadline: null,
  ...overrides,
})

// ── TimesheetEntry ────────────────────────────────────────────────────────────

export const timesheetFactory = (
  projectId: string,
  userId: string,
  workDate: Date,
  overrides: Record<string, unknown> = {}
) => ({
  projectId,
  userId,
  taskId: null,
  hours: 4,
  role: UserRole.DEV,
  workDate,
  notes: null,
  ...overrides,
})

// ── RAGIndex ──────────────────────────────────────────────────────────────────

export const ragIndexFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  totalChunks: 0,
  indexedExtensions: ['.ts', '.md'],
  indexationStatus: IndexationStatus.PENDING,
  lastIndexedAt: null,
  ...overrides,
})

// ── Embedding ────────────────────────────────────────────────────────────────
// Nota: campo `embedding` (vector(384)) requer $executeRaw — factory cria apenas campos escalares

export const embeddingFactory = (ragIndexId: string, overrides: Record<string, unknown> = {}) => ({
  ragIndexId,
  ragDocumentId: null,
  chunkText: `Chunk de teste ${uid()}`,
  filePath: `/src/test-${uid()}.ts`,
  commitSha: 'a'.repeat(40),
  metadata: {},
  ...overrides,
})

// ── RAGDocument ───────────────────────────────────────────────────────────────

export const ragDocumentFactory = (ragIndexId: string, overrides: Record<string, unknown> = {}) => ({
  ragIndexId,
  sourceType: 'github',
  sourcePath: `/src/test-${uid()}.ts`,
  content: 'export const example = "test content for RAG indexing"',
  metadata: {},
  commitSha: null,
  ...overrides,
})

// ── ClientAccess ──────────────────────────────────────────────────────────────

export const clientAccessFactory = (projectId: string, overrides: Record<string, unknown> = {}) => {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  return {
    projectId,
    clientEmail: `client-${uid()}@test.com`,
    clientName: 'Cliente Teste',
    supabaseId: null,
    token: `test-token-${uid()}`,
    expiresAt,
    ...overrides,
  }
}

// ── Benchmark ─────────────────────────────────────────────────────────────────

export const benchmarkFactory = (overrides: Record<string, unknown> = {}) => ({
  projectType: 'web-app',
  projectSize: 'M',
  stack: `nextjs-${uid()}`,
  avgHours: 200,
  stdDev: 50,
  sampleSize: 5,
  ...overrides,
})

// ── Organization ──────────────────────────────────────────────────────────────

export const organizationFactory = (overrides: Record<string, unknown> = {}) => ({
  name: `Org ${uid()}`,
  slug: `org-${uid()}`,
  ...overrides,
})

// ── ProjectMember ─────────────────────────────────────────────────────────────

export const projectMemberFactory = (projectId: string, userId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  userId,
  role: UserRole.DEV,
  ...overrides,
})

// ── BriefQuestion ─────────────────────────────────────────────────────────────

export const briefQuestionFactory = (sessionId: string, order: number, overrides: Record<string, unknown> = {}) => ({
  sessionId,
  question: `Pergunta de teste ${order}?`,
  answer: `Resposta ${order}`,
  order,
  ...overrides,
})

// ── DocumentVersion ───────────────────────────────────────────────────────────

export const documentVersionFactory = (documentId: string, createdBy: string, overrides: Record<string, unknown> = {}) => ({
  documentId,
  createdBy,
  versionNumber: 1,
  content: `Conteúdo de teste ${uid()}`,
  contentHash: `hash-${uid()}`,
  metadata: {},
  ...overrides,
})

// ── EstimateVersion ───────────────────────────────────────────────────────────

export const estimateVersionFactory = (estimateId: string, changedBy: string, overrides: Record<string, unknown> = {}) => ({
  estimateId,
  version: 1,
  snapshot: { minHours: 100, maxHours: 150, confidence: 0.75 },
  changedBy,
  ...overrides,
})

// ── ProjectCategory ───────────────────────────────────────────────────────────

export const projectCategoryFactory = (overrides: Record<string, unknown> = {}) => ({
  name: `Category ${uid()}`,
  type: 'web-app',
  size: 'M',
  stackTags: 'nextjs,react',
  ...overrides,
})

// ── ScopeValidation ───────────────────────────────────────────────────────────

export const scopeValidationFactory = (taskId: string, overrides: Record<string, unknown> = {}) => ({
  taskId,
  result: ScopeResult.VALID,
  similarityScore: 0.85,
  reasoning: 'Task alinhada com escopo do projeto',
  matchedRequirements: ['REQ-001', 'REQ-002'],
  ...overrides,
})

// ── ScopeAlert ────────────────────────────────────────────────────────────────

export const scopeAlertFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  taskId: null,
  type: 'SCOPE_CREEP',
  severity: AlertTier.MEDIUM,
  description: 'Alerta de escopo gerado por factory',
  resolvedAt: null,
  resolvedBy: null,
  ...overrides,
})

// ── ScopeBaseline ─────────────────────────────────────────────────────────────

export const scopeBaselineFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  estimateId: null,
  tasks: [],
  features: [],
  ...overrides,
})

// ── ChangeOrderTask ───────────────────────────────────────────────────────────

export const changeOrderTaskFactory = (changeOrderId: string, taskId: string) => ({
  changeOrderId,
  taskId,
})

// ── ProfitReport ──────────────────────────────────────────────────────────────

export const profitReportFactory = (projectId: string, overrides: Record<string, unknown> = {}) => {
  const start = new Date()
  start.setDate(1)
  const end = new Date()
  return {
    projectId,
    periodStart: start,
    periodEnd: end,
    totalHours: 120,
    totalCost: 18000,
    revenue: 45000,
    margin: 27000,
    breakdown: {},
    ...overrides,
  }
}

// ── Checkpoint ────────────────────────────────────────────────────────────────

export const checkpointFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  percentage: 50,
  marginAtTrigger: 27000,
  alertSent: false,
  ...overrides,
})

// ── RAGQuery ──────────────────────────────────────────────────────────────────

export const ragQueryFactory = (ragIndexId: string, userId: string, overrides: Record<string, unknown> = {}) => ({
  ragIndexId,
  userId,
  query: 'Como funciona a autenticação?',
  answer: 'A autenticação usa Supabase Auth com OAuth GitHub.',
  sources: [],
  latencyMs: 350,
  ...overrides,
})

// ── GitHubSync ────────────────────────────────────────────────────────────────

export const gitHubSyncFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  installationId: `install-${uid()}`,
  repoOwner: 'test-owner',
  repoName: `test-repo-${uid()}`,
  lastWebhookAt: null,
  syncStatus: 'IDLE',
  ...overrides,
})

// ── ClientFeedback ────────────────────────────────────────────────────────────

export const clientFeedbackFactory = (approvalRequestId: string, clientAccessId: string, overrides: Record<string, unknown> = {}) => ({
  approvalRequestId,
  clientAccessId,
  content: 'Feedback de teste do cliente',
  attachments: [],
  ...overrides,
})

// ── ApprovalRequest ───────────────────────────────────────────────────────────

export const approvalRequestFactory = (projectId: string, clientAccessId: string, documentId: string, overrides: Record<string, unknown> = {}) => {
  const sla = new Date()
  sla.setDate(sla.getDate() + 3)
  return {
    projectId,
    clientAccessId,
    documentId,
    documentType: DocumentType.PRD,
    status: 'PENDING',
    slaDeadline: sla,
    ...overrides,
  }
}

// ── ApprovalHistory ───────────────────────────────────────────────────────────

export const approvalHistoryFactory = (approvalRequestId: string, actorId: string, overrides: Record<string, unknown> = {}) => ({
  approvalRequestId,
  action: ApprovalAction.APPROVED,
  comment: null,
  actorId,
  ...overrides,
})

// ── Event ─────────────────────────────────────────────────────────────────────

export const eventFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  type: 'BRIEF_COMPLETED',
  payload: {},
  sourceModule: 'briefforge',
  correlationId: null,
  processedAt: null,
  ...overrides,
})

// ── ApprovalLog ───────────────────────────────────────────────────────────────

export const approvalLogFactory = (documentId: string, userId: string, overrides: Record<string, unknown> = {}) => ({
  documentId,
  versionNumber: 1,
  userId,
  action: ApprovalAction.APPROVED,
  comment: null,
  ipAddress: '127.0.0.1',
  ...overrides,
})

// ── Notification ──────────────────────────────────────────────────────────────

export const notificationFactory = (userId: string, overrides: Record<string, unknown> = {}) => ({
  userId,
  projectId: null,
  type: 'GENERIC',
  channel: NotificationChannel.IN_APP,
  priority: NotificationPriority.MEDIUM,
  payload: {},
  isRead: false,
  groupedId: null,
  readAt: null,
  ...overrides,
})

// ── NotificationPreference ────────────────────────────────────────────────────

export const notificationPreferenceFactory = (userId: string, overrides: Record<string, unknown> = {}) => ({
  userId,
  eventType: 'APPROVAL_PENDING',
  channel: NotificationChannel.IN_APP,
  enabled: true,
  ...overrides,
})

// ── CostRate ──────────────────────────────────────────────────────────────────

export const costRateFactory = (organizationId: string, overrides: Record<string, unknown> = {}) => ({
  organizationId,
  role: UserRole.DEV,
  hourlyRate: 140,
  currency: 'BRL',
  ...overrides,
})

// ── ProjectCostRate ───────────────────────────────────────────────────────────

export const projectCostRateFactory = (projectId: string, overrides: Record<string, unknown> = {}) => ({
  projectId,
  role: UserRole.DEV,
  hourlyRate: 160,
  currency: 'BRL',
  ...overrides,
})

// ── EmailLog ──────────────────────────────────────────────────────────────────

export const emailLogFactory = (overrides: Record<string, unknown> = {}) => ({
  to: `email-${uid()}@test.com`,
  type: 'invite',
  projectId: null,
  subject: 'Email de teste',
  status: 'SENT',
  sentAt: new Date(),
  resendMessageId: null,
  ...overrides,
})

// ── AuditLog ──────────────────────────────────────────────────────────────────

export const auditLogFactory = (userId: string, overrides: Record<string, unknown> = {}) => ({
  userId,
  action: 'UPDATE',
  resourceType: 'Project',
  resourceId: uid(),
  beforeState: null,
  afterState: {},
  ipAddress: '127.0.0.1',
  ...overrides,
})
