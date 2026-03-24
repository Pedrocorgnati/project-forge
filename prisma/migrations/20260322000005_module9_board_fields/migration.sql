-- Migration: module9_board_fields
-- Módulo: module-9-scopeshield-board / TASK-0 + TASK-1
-- Rastreabilidade INTAKE: INT-060
-- Aplicar via: npx prisma migrate deploy (requer DIRECT_URL)

-- ── 1. Adicionar REVIEW ao enum TaskStatus ────────────────────────────────────
-- ALTER TYPE ... ADD VALUE é transacional em PostgreSQL 12+
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'REVIEW' BEFORE 'DONE';

-- ── 2. Criar enum TaskPriority ────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
    CREATE TYPE "TaskPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');
  END IF;
END$$;

-- ── 3. Adicionar colunas na tabela tasks ──────────────────────────────────────
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "priority"      "TaskPriority"  NOT NULL DEFAULT 'P2',
  ADD COLUMN IF NOT EXISTS "labels"        TEXT[]          NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "actual_hours"  DECIMAL(10, 2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "due_date"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "created_by"    UUID;

-- Backfill: preencher created_by com o assignee existente (ou NULL — aceitável pois é migration de desenvolvimento)
-- Em produção usar um user_id real de sistema se necessário

-- Adicionar constraint FK após backfill
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT
  DEFERRABLE INITIALLY DEFERRED;

-- ── 4. Índice para created_by em tasks ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "IDX_tasks_created_by"
  ON "tasks" ("created_by");

-- ── 5. Adicionar colunas na tabela scope_baselines ────────────────────────────
ALTER TABLE "scope_baselines"
  ADD COLUMN IF NOT EXISTS "created_by"  UUID,
  ADD COLUMN IF NOT EXISTS "name"        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshot"    JSONB,
  ADD COLUMN IF NOT EXISTS "task_count"  INTEGER NOT NULL DEFAULT 0;

-- FK para created_by em scope_baselines
ALTER TABLE "scope_baselines"
  ADD CONSTRAINT "scope_baselines_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
