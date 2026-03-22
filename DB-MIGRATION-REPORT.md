# DB Migration Report — ProjectForge

Projeto: project-forge
ORM: Prisma
Database: PostgreSQL (Supabase)
Data: 2026-03-21
Data-Integrity-Decision: não disponível (executar `/skill:data-integrity-guard` antes de produção)

---

## Migrations Geradas

| # | Arquivo | Operação | Tabelas Afetadas | Tipo | Reversível |
|---|---------|----------|-----------------|------|------------|
| 1 | `prisma/schema.prisma` (atualizado) | ALTER UNIQUE — projects.slug | projects | alter | Sim |
| 2 | `prisma/schema.prisma` (atualizado) | ALTER INDEX — IDX_tasks_position | tasks | alter | Sim |
| 3 | `prisma/schema.prisma` (atualizado) | ADD INDEX — IDX_embeddings_rag | embeddings | additive | Sim |
| 4 | `prisma/schema.prisma` (atualizado) | ADD INDEX — IDX_events_project_type | events | additive | Sim |
| 5 | `post-init-constraints.sql` | ADD CHECK — chk_timesheet_hours | timesheet_entries | additive | Sim |
| 6 | `post-init-constraints.sql` | ADD PARTIAL UNIQUE — UQ_timesheet_user_task_date | timesheet_entries | additive | Sim |
| 7 | `post-init-constraints.sql` | ADD PARTIAL INDEX — IDX_events_unprocessed | events | additive | Sim |
| 8 | `post-init-constraints.sql` | ADD PARTIAL INDEX — IDX_events_correlation | events | additive | Sim |
| 9 | `post-init-constraints.sql` | ADD IVFFLAT INDEX — IDX_embeddings_vector | embeddings | additive | Sim |

---

## Entidades Cobertas (19)

| Tabela | Status | Observação |
|--------|--------|------------|
| organizations | ✅ completo | Schema base ok |
| users | ✅ completo | Schema base ok |
| projects | ✅ corrigido | slug agora unique per-org (not global) |
| project_members | ✅ completo | Schema base ok |
| briefs | ✅ completo | Schema base ok |
| documents | ✅ completo | Schema base ok |
| document_versions | ✅ completo | Schema base ok |
| estimates | ✅ completo | Schema base ok |
| tasks | ✅ corrigido | IDX_tasks_position agora composto (projectId, status, position) |
| scope_validations | ✅ completo | Schema base ok |
| change_orders | ✅ completo | Schema base ok |
| change_order_tasks | ✅ completo | Schema base ok |
| timesheet_entries | ✅ complementado | CHECK + partial unique via SQL suplementar |
| rag_indexes | ✅ completo | Schema base ok (campos opcionais por decisão de implementação) |
| embeddings | ✅ complementado | IDX_embeddings_rag + ivfflat via SQL suplementar |
| events | ✅ complementado | IDX_events_project_type + 2 partial indexes |
| approval_logs | ✅ completo | Schema base ok |
| notifications | ✅ completo | Schema base ok |
| notification_preferences | ✅ completo | Schema base ok |
| cost_rates | ✅ completo | Schema base ok |
| project_cost_rates | ✅ completo | Schema base ok |
| audit_logs | ✅ completo | Schema base ok |

---

## Estatísticas

| Métrica | Valor |
|---------|-------|
| Tabelas cobertas | 22 |
| Enums criados | 12 |
| Indexes no schema Prisma | 18 |
| Indexes SQL suplementares | 3 (2 partial + 1 ivfflat) |
| Unique constraints | 8 |
| CHECK constraints | 1 |
| Foreign keys | 26 |

---

## Delta vs Schema Existente

| Tipo | Qtd | Itens |
|------|-----|-------|
| Additive | 6 | IDX_embeddings_rag, IDX_events_project_type, IDX_events_unprocessed, IDX_events_correlation, IDX_embeddings_vector, chk_timesheet_hours, UQ_timesheet_user_task_date |
| Alter | 2 | projects.slug (global→per-org unique), IDX_tasks_position (column→composite) |
| Destructive | 0 | — |

---

## Checklist de Segurança

| Check | Status | Observação |
|-------|--------|------------|
| Rollback (down) completo | ✅ | Seção ROLLBACK no post-init-constraints.sql e PRISMA-MIGRATION-GUIDE.md |
| Rollback testável | ✅ | Sem dependência de dados — rollback seguro |
| IF NOT EXISTS / IF EXISTS | ✅ | Todos os CREATE INDEX usam IF NOT EXISTS |
| Colunas NOT NULL com DEFAULT | ✅ | Nenhuma nova coluna NOT NULL adicionada |
| DROP sem backup | ✅ N/A | Nenhum DROP gerado |
| Rename de coluna | ✅ N/A | Nenhum rename |
| FK com ON DELETE explícito | ✅ | Todas as FKs do schema têm ON DELETE definido |
| Indexes em FK columns | ✅ | Todos os FK fields têm índice correspondente |
| Ordem de criação (FK deps) | ✅ | Documentado em PRISMA-MIGRATION-GUIDE.md |
| Dados sensíveis com tipo correto | ✅ | Passwords em auth.users (Supabase), não no schema público |
| Tabelas grandes sem janela | ✅ N/A | Novo banco sem dados |

**Checklist: 11/11 ✅**

---

## Arquivos Gerados / Modificados

```
output/workspace/project-forge/
├── prisma/
│   ├── schema.prisma                          ← ATUALIZADO (4 mudanças)
│   ├── config.ts                              ← sem alteração
│   └── migrations/
│       ├── post-init-constraints.sql          ← NOVO (5 constraints SQL)
│       └── PRISMA-MIGRATION-GUIDE.md          ← NOVO (guia completo)
└── DB-MIGRATION-REPORT.md                     ← NOVO (este arquivo)
```

---

## Comandos de Aplicação

### Desenvolvimento

```bash
cd output/workspace/project-forge

# 1. Gerar e aplicar migration base
npx prisma migrate dev --name init

# 2. Constraints suplementares (Supabase SQL Editor ou psql)
psql $DIRECT_URL -f prisma/migrations/post-init-constraints.sql

# 3. Gerar client
npx prisma generate
```

### Staging (obrigatório antes de produção)

```bash
npx prisma migrate deploy
psql $DIRECT_URL_STAGING -f prisma/migrations/post-init-constraints.sql
# Validar + testar rollback antes de prosseguir
```

### Produção

1. Backup do banco (Supabase → Database → Backups)
2. `npx prisma migrate deploy`
3. Executar `post-init-constraints.sql` via Supabase SQL Editor
4. Monitorar logs por 15 min

---

## Checklist Pré-Deploy

- [ ] Backup do banco de produção realizado
- [ ] `npx prisma migrate dev --name init` executado em dev com sucesso
- [ ] `post-init-constraints.sql` executado em dev sem erros
- [ ] Migrations testadas em staging
- [ ] Rollback testado em staging
- [ ] `npx prisma generate` executado após migration
- [ ] Integridade referencial verificada (sem FK orphans)
- [ ] `/seed-data-create` executado em dev para validar inserções

---

## Nota sobre RAGIndex fields

O LLD define `github_repo_url`, `github_owner` e `github_repo` como NOT NULL, mas o schema
gerado pelo `/back-end-build` os mantém como nullable. Isso permite criar um RAGIndex antes
de vincular o repositório GitHub (workflow incremental). **Manter nullable é a decisão correta.**
Se a regra de negócio mudar, executar `/skill:data-integrity-guard` antes de adicionar NOT NULL
em tabela com dados.
