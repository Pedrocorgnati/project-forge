# Prisma Migrations — ProjectForge

## Pré-requisitos

Configure as variáveis no `.env.local`:

```bash
# Conexão via PgBouncer (pooler, porta 6543) — para queries da app
DATABASE_URL=postgresql://postgres.{ref}:{password}@aws-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Conexão direta (porta 5432) — obrigatória para migrations
DIRECT_URL=postgresql://postgres.{ref}:{password}@aws-us-east-1.pooler.supabase.com:5432/postgres
```

## Comandos

| Comando | Ambiente | Descrição |
|---------|----------|-----------|
| `npx prisma migrate dev --name init` | dev | Gera e aplica migration inicial (40 tabelas) |
| `npx prisma migrate deploy` | prod/staging | Aplica migrations pendentes sem prompt |
| `npx prisma migrate reset --force` | dev only | Destrói banco e re-aplica tudo |
| `npx prisma migrate status` | qualquer | Status atual das migrations |
| `npx prisma migrate resolve --applied <name>` | qualquer | Marca migration como já aplicada |
| `npx prisma db push` | prototipagem | Sync sem migration (não versionado) |
| `npx prisma generate` | qualquer | Regenera o PrismaClient |
| `npx prisma studio` | dev | Abre GUI para explorar dados |

## Sequência de Deploy Inicial

```bash
cd output/workspace/project-forge

# 1. Marcar migration pgvector como aplicada (já ativa no Supabase)
npx prisma migrate resolve --applied 20260313000001_pgvector

# 2. Gerar e aplicar migration base (40 tabelas)
npx prisma migrate dev --name init

# 3. Aplicar constraints suplementares (via Supabase SQL Editor ou psql)
psql $DIRECT_URL -f prisma/migrations/post-init-constraints.sql

# 4. Gerar PrismaClient
npx prisma generate

# 5. Executar seeds
npx prisma db seed
```

## Política de Migrations

- Migrations são **imutáveis** após deploy em produção
- Nunca editar `migration.sql` após commit
- Sempre criar nova migration para correções (`npx prisma migrate dev --name fix_xxx`)
- `DIRECT_URL` obrigatória para `migrate dev` e `migrate deploy` (bypassa PgBouncer)
- Migrations de pgvector marcadas via `migrate resolve --applied`
- `migrate reset --force` **somente em dev** — bloqueado em prod pelo Prisma

## Estrutura

```
prisma/
├── config.ts                              # Configuração de conexão (Prisma 7)
├── schema.prisma                          # Schema principal (40 modelos, 13 enums)
├── seed.ts                                # Script master de seed (env-conditional)
├── seeds/
│   ├── prod.ts                            # Seed de produção (dados obrigatórios)
│   └── dev.ts                             # Seed de desenvolvimento (dados fictícios)
├── factories/
│   └── index.ts                           # Factories tipadas para testes
└── migrations/
    ├── 20260313000001_pgvector/           # CREATE EXTENSION vector (marcada como applied)
    │   └── migration.sql
    ├── {timestamp}_init/                  # Schema completo (40 tabelas, gerado por migrate dev)
    │   └── migration.sql
    └── post-init-constraints.sql          # Constraints suplementares (CHECK, partial indexes, IVFFlat)
```

## Modelos (40 total)

| Domínio | Modelos |
|---------|---------|
| Multi-tenancy | Organization |
| Usuários | User, ProjectMember |
| Projetos | Project, ProjectCostRate, CostRate |
| BriefForge | Brief, BriefSession, BriefQuestion |
| Documentos | Document, DocumentVersion |
| EstimaAI | Estimate, EstimateItem, EstimateVersion, Benchmark, ProjectCategory |
| ScopeShield | Task, ScopeValidation, ScopeAlert, ScopeBaseline, ChangeOrder, ChangeOrderTask |
| HandoffAI | RAGIndex, RAGDocument, Embedding, RAGQuery, GitHubSync |
| RentabilIA | TimesheetEntry, ProfitReport, Checkpoint |
| ClientPortal | ClientAccess, ApprovalRequest, ApprovalHistory, ClientFeedback |
| Plataforma | Event, Notification, NotificationPreference, ApprovalLog, AuditLog, EmailLog |

## Enums (13 total)

`ProjectStatus` · `UserRole` · `DocumentType` · `DocumentStatus` · `EstimateStatus` ·
`TaskStatus` · `ScopeResult` · `ChangeOrderStatus` · `AlertTier` · `NotificationChannel` ·
`NotificationPriority` · `ApprovalAction` · `IndexationStatus`

## Rollback de Emergência (prod)

```bash
# 1. Listar migrations aplicadas
npx prisma migrate status

# 2. Para reverter última migration (requer migration manual de rollback)
# Criar migration de rollback com DROP TABLE das novas tabelas

# 3. Restaurar backup do Supabase (última alternativa)
# Dashboard → Database → Backups → Restore
```
