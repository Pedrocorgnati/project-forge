-- ─────────────────────────────────────────────────────────────────────────────
-- POST-INIT CONSTRAINTS — ProjectForge
-- Gerado por: /db-migration-create | 2026-03-21
--
-- QUANDO EXECUTAR:
--   Após "npx prisma migrate dev --name init" criar o schema base.
--   Execute este arquivo via Supabase SQL Editor ou psql.
--
-- ROLLBACK:
--   Ver seção ROLLBACK ao final deste arquivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Habilitar extensão pgvector (se não habilitada via Prisma migrate)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CHECK constraint: timesheet_entries.hours (0 < hours <= 24)
--    Prisma não suporta CHECK constraints nativamente.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE timesheet_entries
  ADD CONSTRAINT chk_timesheet_hours
  CHECK (hours > 0 AND hours <= 24);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Partial UNIQUE index: timesheet_entries
--    Impede duplicata na mesma task/dia (somente se task_id IS NOT NULL e não deletado)
--    Fonte: LLD.md § Tabela timesheet_entries — UQ_timesheet_user_task_date
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS UQ_timesheet_user_task_date
  ON timesheet_entries (user_id, task_id, work_date)
  WHERE task_id IS NOT NULL AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Partial INDEX: events — eventos não processados (polling de eventos pendentes)
--    Fonte: LLD.md § Tabela events — IDX_events_unprocessed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_events_unprocessed
  ON events (project_id, created_at)
  WHERE processed_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Partial INDEX: events — rastreamento de cascatas de eventos por correlation_id
--    Fonte: LLD.md § Tabela events — IDX_events_correlation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_events_correlation
  ON events (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ivfflat INDEX: embeddings — busca vetorial por similaridade de cosseno
--    Fonte: LLD.md § Tabela embeddings — IDX_embeddings_vector
--    NOTA: lists=100 é adequado para até ~1M chunks. Ajustar se volume crescer.
--    Requer que a tabela já tenha dados para ser eficiente (pode criar vazia).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_embeddings_vector
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- VALIDAÇÃO PÓS-EXECUÇÃO
-- Execute estes queries para confirmar que tudo foi criado:
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'timesheet_entries'::regclass AND conname = 'chk_timesheet_hours';
--
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename IN ('timesheet_entries', 'events', 'embeddings')
--     AND indexname IN (
--       'UQ_timesheet_user_task_date',
--       'IDX_events_unprocessed',
--       'IDX_events_correlation',
--       'IDX_embeddings_vector'
--     );

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar na ordem inversa se necessário reverter)
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS IDX_embeddings_vector;
-- DROP INDEX IF EXISTS IDX_events_correlation;
-- DROP INDEX IF EXISTS IDX_events_unprocessed;
-- DROP INDEX IF EXISTS UQ_timesheet_user_task_date;
-- ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS chk_timesheet_hours;
-- DROP EXTENSION IF EXISTS vector; -- CUIDADO: remove todos os dados vetoriais
