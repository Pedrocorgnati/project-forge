-- ─────────────────────────────────────────────────────────────────────────────
-- POST-INIT CONSTRAINTS — ProjectForge
-- Atualizado em: 2026-03-21 (módulo-1 completo — 40 tabelas)
--
-- QUANDO EXECUTAR:
--   Após "npx prisma migrate dev --name init" criar o schema base.
--   Execute este arquivo via Supabase SQL Editor ou psql.
--
-- ROLLBACK:
--   Ver seção ROLLBACK ao final deste arquivo.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Habilitar extensão pgvector (se não habilitada via migration 20260313000001_pgvector)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CHECK constraint: timesheet_entries.hours (0 < hours <= 24)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE timesheet_entries
  ADD CONSTRAINT chk_timesheet_hours
  CHECK (hours > 0 AND hours <= 24);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Partial UNIQUE index: timesheet_entries
--    Impede duplicata na mesma task/dia (somente se task_id IS NOT NULL e não deletado)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS UQ_timesheet_user_task_date
  ON timesheet_entries (user_id, task_id, work_date)
  WHERE task_id IS NOT NULL AND deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Partial INDEX: events — eventos não processados
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_events_unprocessed
  ON events (project_id, created_at)
  WHERE processed_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Partial INDEX: events — rastreamento por correlation_id
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_events_correlation
  ON events (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. IVFFlat INDEX: embeddings — busca vetorial por similaridade de cosseno
--    NOTA: lists=100 adequado para até ~1M chunks.
--    Para fase inicial (< 1000 embeddings), pode usar HNSW:
--      CREATE INDEX IF NOT EXISTS IDX_embeddings_hnsw
--        ON embeddings USING hnsw (embedding vector_cosine_ops)
--        WITH (m = 16, ef_construction = 64);
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_embeddings_vector
  ON embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. CHECK constraint: checkpoints.percentage (0 < percentage <= 100)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE checkpoints
  ADD CONSTRAINT chk_checkpoint_percentage
  CHECK (percentage > 0 AND percentage <= 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CHECK constraint: email_logs.status (valores permitidos)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE email_logs
  ADD CONSTRAINT chk_email_log_status
  CHECK (status IN ('PENDING', 'SENT', 'BOUNCED', 'COMPLAINED', 'FAILED'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. CHECK constraint: approval_requests.status (valores permitidos)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE approval_requests
  ADD CONSTRAINT chk_approval_request_status
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CLARIFICATION_REQUESTED'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CHECK constraint: brief_sessions.status (valores permitidos)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE brief_sessions
  ADD CONSTRAINT chk_brief_session_status
  CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Partial INDEX: approval_requests — SLA expirado e pendente (cron job)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_approval_requests_pending_sla
  ON approval_requests (sla_deadline)
  WHERE status = 'PENDING';

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Partial INDEX: scope_alerts — alertas não resolvidos
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS IDX_scope_alerts_unresolved
  ON scope_alerts (project_id, severity)
  WHERE resolved_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Função SQL: match_embeddings (busca vetorial por similaridade de cosseno)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_embeddings(
  query_vector    vector(384),
  p_rag_index_id  uuid,
  match_count     int     DEFAULT 5,
  match_threshold float   DEFAULT 0.7
)
RETURNS TABLE (
  id              uuid,
  "ragDocumentId" uuid,
  chunk_text      text,
  similarity      float
)
LANGUAGE sql STABLE AS $$
  SELECT
    e.id,
    e.rag_document_id AS "ragDocumentId",
    e.chunk_text,
    1 - (e.embedding <=> query_vector) AS similarity
  FROM embeddings e
  WHERE e.rag_index_id = p_rag_index_id
    AND e.embedding IS NOT NULL
    AND 1 - (e.embedding <=> query_vector) > match_threshold
  ORDER BY e.embedding <=> query_vector
  LIMIT match_count;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VALIDAÇÃO PÓS-EXECUÇÃO
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT conname, contype FROM pg_constraint
--   WHERE conrelid = 'timesheet_entries'::regclass AND conname = 'chk_timesheet_hours';
--
-- SELECT indexname, tablename FROM pg_indexes
--   WHERE schemaname = 'public'
--   ORDER BY tablename, indexname;
--
-- SELECT proname FROM pg_proc WHERE proname = 'match_embeddings';
--
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (executar na ordem inversa se necessário reverter)
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS match_embeddings(vector, uuid, int, float);
-- DROP INDEX IF EXISTS IDX_scope_alerts_unresolved;
-- DROP INDEX IF EXISTS IDX_approval_requests_pending_sla;
-- ALTER TABLE brief_sessions DROP CONSTRAINT IF EXISTS chk_brief_session_status;
-- ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS chk_approval_request_status;
-- ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS chk_email_log_status;
-- ALTER TABLE checkpoints DROP CONSTRAINT IF EXISTS chk_checkpoint_percentage;
-- DROP INDEX IF EXISTS IDX_embeddings_vector;
-- DROP INDEX IF EXISTS IDX_events_correlation;
-- DROP INDEX IF EXISTS IDX_events_unprocessed;
-- DROP INDEX IF EXISTS UQ_timesheet_user_task_date;
-- ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS chk_timesheet_hours;
-- DROP EXTENSION IF EXISTS vector; -- CUIDADO: remove todos os dados vetoriais
