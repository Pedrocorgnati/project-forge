# Backend Build Report

**Projeto:** project-forge
**Stack:** nextjs-api (Next.js Server Actions + API Routes)
**Auth:** Supabase SSR + MFA (TOTP)
**Database:** PostgreSQL + Prisma v7 + pgvector
**ORM:** Prisma (via `prisma/schema.prisma` + `prisma/config.ts`)
**Data:** 2026-03-21

---

## Estrutura Gerada

### Models / Schemas Prisma (21 modelos)
| Arquivo | Entidades |
|---------|-----------|
| `prisma/schema.prisma` | Organization, User, Project, ProjectMember, Brief, Document, DocumentVersion, Estimate, Task, ScopeValidation, ChangeOrder, ChangeOrderTask, TimesheetEntry, RAGIndex, Embedding, Event, ApprovalLog, Notification, NotificationPreference, CostRate, ProjectCostRate, AuditLog |

### Supabase Clients (3 arquivos)
| Arquivo | Função |
|---------|--------|
| `src/lib/supabase/server.ts` | Client SSR para Server Components/Actions |
| `src/lib/supabase/client.ts` | Client browser para Client Components |
| `src/lib/supabase/middleware.ts` | updateSession para middleware de auth |

### Infraestrutura (4 arquivos)
| Arquivo | Função |
|---------|--------|
| `src/lib/db.ts` | Prisma singleton (prevenção de múltiplas instâncias em dev) |
| `src/lib/auth.ts` | `getAuthUser()` + `getAuthUserOrNull()` |
| `src/lib/rbac.ts` | `withProjectAccess()`, `canAssignRole()`, `requireFinancialAccess()` |
| `src/lib/errors.ts` | `AppError`, `getErrorMessage()`, `toActionError()` |

### Constantes de Erro (1 arquivo)
| Arquivo | Conteúdo |
|---------|----------|
| `src/lib/constants/errors.ts` | 30 códigos de erro do ERROR-CATALOG (AUTH, VAL, PROJECT, BRIEF, DOC, TASK, CO, TS, HANDOFF, RATE, SYS) |

### Schemas Zod — Validação de Input (9 arquivos)
| Arquivo | Schemas |
|---------|---------|
| `src/schemas/project.schema.ts` | CreateProject, UpdateProject, AddProjectMember, ListProjects |
| `src/schemas/document.schema.ts` | CreateDocument, CreateDocumentVersion, ListDocuments, DiffDocument, SendApproval, ApprovalAction |
| `src/schemas/estimate.schema.ts` | CreateEstimate, ListEstimates |
| `src/schemas/task.schema.ts` | CreateTask, UpdateTask, RegisterScopeValidation, ListTasks |
| `src/schemas/change-order.schema.ts` | CreateChangeOrder, ListChangeOrders |
| `src/schemas/timesheet.schema.ts` | CreateTimesheetEntry, ListTimesheet |
| `src/schemas/handoff.schema.ts` | StartIndexation, UpdateIndexStatus, InsertEmbeddings, QueryEmbeddings |
| `src/schemas/notification.schema.ts` | ListNotifications, UpdateNotificationPreference |
| `src/schemas/settings.schema.ts` | CostRate, UpdateCostRates |
| `src/schemas/index.ts` | Re-exports de todos os schemas |

### Server Actions (7 arquivos atualizados)
| Arquivo | Cobertura |
|---------|-----------|
| `src/actions/auth.ts` | signIn, signOut, GitHub OAuth, MFA setup/verify, acceptInvite — **implementado** |
| `src/actions/projects.ts` | getProjects, getProject, createProject, updateProject, getProjectPnL, getProjectMembers, addProjectMember, removeProjectMember — **implementado** |
| `src/actions/briefforge.ts` | getBrief, updateBrief, startBriefSession — **implementado** |
| `src/actions/estimai.ts` | getEstimates, createEstimate, approveEstimate — **implementado** |
| `src/actions/scopeshield.ts` | getTasks, createTask, updateTask, getTaskScope, registerScopeValidation, getChangeOrders, createChangeOrder — **implementado** |
| `src/actions/rentabilia.ts` | getTimeEntries, logTime, deleteTimeEntry (undo 24h), getRentabilityDashboard — **implementado** |
| `src/actions/notifications.ts` | getNotifications, markNotificationRead, markAllNotificationsRead, getNotificationPreferences, updateNotificationPreference — **implementado** |

### API Routes (2 arquivos)
| Arquivo | Função |
|---------|--------|
| `src/app/auth/callback/route.ts` | `GET` — troca code Supabase por sessão (OAuth callback) |
| `src/app/api/webhooks/github/[projectId]/route.ts` | `POST` — GitHub webhook com validação HMAC-SHA256 `timingSafeEqual` (THREAT-005) |

### Middleware Atualizado
| Arquivo | Função |
|---------|--------|
| `src/middleware.ts` | Supabase SSR session guard — protege todas as rotas exceto `/login`, `/auth/**`, `/api/webhooks/**` |

---

## Stubs Pendentes

Os seguintes métodos são stubs e precisam de implementação via `/auto-flow execute`:

| Módulo | Método | Descrição |
|--------|--------|-----------|
| `briefforge.ts` | `answerBriefQuestion` | Streaming Claude CLI para BriefForge |
| `briefforge.ts` | `generatePRD` | Geração PRD via Claude CLI |
| `estimai.ts` | `generateEstimate` | Estimativa via Claude CLI + PRD |
| `scopeshield.ts` | `detectScopeDeviation` | Comparação horas estimadas vs realizadas |
| `rentabilia.ts` | `exportTimesheet` | Exportação CSV/PDF |
| `projects.ts` | `getProjectPnL` | Cálculo completo de P&L |
| `rentabilia.ts` | `getRentabilityDashboard` | Dashboard de rentabilidade |
| **Eventos** | `emitEvent` | Event bus (TASK_CREATED, SCOPE_ALERT, TIMESHEET_SUBMITTED, etc.) |

---

## Segurança Implementada (THREAT-MODEL)

| Ameaça | Mitigação |
|--------|-----------|
| THREAT-001: IDOR | `withProjectAccess()` valida membro antes de cada operação |
| THREAT-002: Privilege Escalation | `canAssignRole()` — role atribuído ≤ role do solicitante |
| THREAT-004: Mass Assignment | Zod `.pick()` por endpoint (schemas separados por operação) |
| THREAT-005: GitHub Webhook Replay | `timingSafeEqual()` + validação do `x-github-delivery` |
| THREAT-006: Financial Data | `requireFinancialAccess()` em P&L e cost-rates |
| THREAT-008: Audit Log | `AppError` captura IP + base para AuditLog |
| THREAT-011: Cross-Org Access | `withProjectAccess()` valida `organization_id` via JOIN |

---

## Build Status

```
TypeScript:  ✅ PASSOU (0 erros)
Prisma:      ✅ Válido + Client gerado
```

---

## Próximos Passos

1. `/env-creation` — configurar `.env.local` com valores reais do Supabase
2. `/db-migration-create` — gerar migrations do banco (`prisma migrate dev`)
3. `/create-test-user` — criar usuários de teste por role
4. `/auto-flow execute` — implementar lógica de negócio task a task
