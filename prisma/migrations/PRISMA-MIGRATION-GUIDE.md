# Prisma Migration Guide — ProjectForge

Gerado por: `/db-migration-create` | 2026-03-21
ORM: Prisma | DB: PostgreSQL (Supabase)

---

## Arquitetura de Migration

Este projeto usa **duas camadas de migration**:

| Camada | Arquivo | Responsável |
|--------|---------|-------------|
| Schema base (Prisma) | `prisma/schema.prisma` | `npx prisma migrate dev` |
| Constraints avançadas (SQL) | `prisma/migrations/post-init-constraints.sql` | Supabase SQL Editor ou psql |

A camada SQL suplementar é necessária porque o Prisma não suporta nativamente:
- `CHECK` constraints
- Partial indexes (`WHERE` clause)
- `ivfflat` indexes (pgvector)

---

## Pré-Requisitos

```bash
# Variáveis de ambiente obrigatórias
DATABASE_URL=postgresql://...   # Connection pooler (Transaction mode) — Supabase
DIRECT_URL=postgresql://...     # Direct connection — necessário para migrations Prisma
```

No Supabase: **Settings → Database → Connection string**
- `DATABASE_URL` → Transaction pooler (porta 6543)
- `DIRECT_URL` → Direct connection (porta 5432)

---

## Execução — Desenvolvimento

### Passo 1: Gerar e aplicar migration base

```bash
cd output/workspace/project-forge
npx prisma migrate dev --name init
```

Isso criará `prisma/migrations/[timestamp]_init/migration.sql` com todas as tabelas, enums e indexes do schema.

### Passo 2: Aplicar constraints suplementares

Abra o Supabase SQL Editor e execute o conteúdo de:
```
prisma/migrations/post-init-constraints.sql
```

Ou via psql (conexão direta):
```bash
psql $DIRECT_URL -f prisma/migrations/post-init-constraints.sql
```

### Passo 3: Gerar Prisma Client

```bash
npx prisma generate
```

---

## Execução — Staging (obrigatório antes de produção)

```bash
# 1. Aplicar em staging
npx prisma migrate deploy   # usa DATABASE_URL do ambiente

# 2. Aplicar constraints suplementares em staging
psql $DIRECT_URL_STAGING -f prisma/migrations/post-init-constraints.sql

# 3. Validar contagem de tabelas
psql $DIRECT_URL_STAGING -c "
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
"

# 4. Validar integridade referencial
psql $DIRECT_URL_STAGING -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint WHERE contype = 'f'
  ORDER BY conrelid::regclass::text;
"
```

---

## Execução — Produção

1. **Backup do banco** antes de aplicar (Supabase → Database → Backups)
2. Aplicar em janela de baixo tráfego (recomendado: fora do horário comercial)

```bash
# Produção — nunca usar migrate dev (apenas migrate deploy)
npx prisma migrate deploy

# Constraints suplementares via Supabase SQL Editor (produção)
# Cole o conteúdo de post-init-constraints.sql
```

---

## Ordem de Criação das Tabelas

Prisma gerencia automaticamente a ordem baseada nas relações. A ordem lógica é:

```
1. organizations
2. users                 (FK → organizations)
3. projects              (FK → organizations)
4. project_members       (FK → projects, users)
5. briefs                (FK → projects)
6. cost_rates            (FK → organizations)
7. project_cost_rates    (FK → projects)
8. documents             (FK → projects, users)
9. document_versions     (FK → documents, users)
10. estimates            (FK → projects, users)
11. tasks                (FK → projects, users)
12. scope_validations    (FK → tasks)
13. change_orders        (FK → projects, users, documents)
14. change_order_tasks   (FK → change_orders, tasks)
15. timesheet_entries    (FK → projects, users, tasks)
16. rag_indexes          (FK → projects)
17. embeddings           (FK → rag_indexes)
18. events               (FK → projects)
19. approval_logs        (FK → documents, users)
20. notifications        (FK → users, projects)
21. notification_preferences (FK → users)
22. audit_logs           (FK → users)
```

---

## Rollback

### Rollback de constraints suplementares

```bash
psql $DIRECT_URL -c "
  DROP INDEX IF EXISTS IDX_embeddings_vector;
  DROP INDEX IF EXISTS IDX_events_correlation;
  DROP INDEX IF EXISTS IDX_events_unprocessed;
  DROP INDEX IF EXISTS UQ_timesheet_user_task_date;
  ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS chk_timesheet_hours;
"
```

### Rollback completo (apenas em dev — destrói todos os dados)

```bash
npx prisma migrate reset
```

---

## Boas Práticas

- **Nunca editar** arquivos dentro de `prisma/migrations/[timestamp]_*/` após aplicados em produção
- **Sempre testar** rollback em staging antes de aplicar em produção
- **Manter `post-init-constraints.sql`** no controle de versão — é parte integrante do schema
- Para novas migrations futuras: `npx prisma migrate dev --name [descricao_da_mudanca]`
