-- Migration: module10_scope_alert_enrich
-- Módulo: module-10-scopeshield-validation / TASK-0
-- Rastreabilidade INTAKE: INT-066, INT-067
-- Aplicar via: npx prisma migrate deploy (requer DIRECT_URL)

-- ── 1. Criar enum ScopeAlertType ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScopeAlertType') THEN
    CREATE TYPE "ScopeAlertType" AS ENUM ('SCOPE_CREEP', 'OUT_OF_SCOPE', 'DUPLICATE');
  END IF;
END$$;

-- ── 2. Criar enum AlertStatus ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertStatus') THEN
    CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'DISMISSED');
  END IF;
END$$;

-- ── 3. Enriquecer tabela scope_alerts ─────────────────────────────────────────
-- 3a. Converter coluna type de VARCHAR para enum ScopeAlertType
--     Mapear: MISSING_TASK -> SCOPE_CREEP (mais próximo semanticamente)
UPDATE "scope_alerts"
SET type = CASE
  WHEN type = 'OUT_OF_SCOPE'  THEN 'OUT_OF_SCOPE'
  WHEN type = 'SCOPE_CREEP'   THEN 'SCOPE_CREEP'
  WHEN type = 'MISSING_TASK'  THEN 'SCOPE_CREEP'
  ELSE 'SCOPE_CREEP'
END
WHERE type IS NOT NULL;

ALTER TABLE "scope_alerts"
  ALTER COLUMN "type" TYPE "ScopeAlertType"
    USING "type"::"ScopeAlertType";

-- 3b. Adicionar coluna ai_rationale (nullable inicialmente para dados existentes)
ALTER TABLE "scope_alerts"
  ADD COLUMN IF NOT EXISTS "ai_rationale"    TEXT NOT NULL DEFAULT '';

-- 3c. Adicionar related_task_id
ALTER TABLE "scope_alerts"
  ADD COLUMN IF NOT EXISTS "related_task_id" UUID;

-- 3d. Adicionar status com default OPEN
ALTER TABLE "scope_alerts"
  ADD COLUMN IF NOT EXISTS "status" "AlertStatus" NOT NULL DEFAULT 'OPEN';

-- 3e. Renomear resolved_by → dismissed_by, resolved_at → dismissed_at
ALTER TABLE "scope_alerts"
  RENAME COLUMN "resolved_by" TO "dismissed_by";

ALTER TABLE "scope_alerts"
  RENAME COLUMN "resolved_at" TO "dismissed_at";

-- 3f. Adicionar dismiss_reason
ALTER TABLE "scope_alerts"
  ADD COLUMN IF NOT EXISTS "dismiss_reason" TEXT;

-- 3g. Adicionar updated_at
ALTER TABLE "scope_alerts"
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3h. Tornar taskId obrigatório (não-nullable)
--     Backfill: scope_alerts sem task_id não são válidos para module-10
UPDATE "scope_alerts" SET "task_id" = '00000000-0000-0000-0000-000000000000' WHERE "task_id" IS NULL;
ALTER TABLE "scope_alerts" ALTER COLUMN "task_id" SET NOT NULL;

-- ── 4. Criar índice adicional por status ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS "IDX_scope_alerts_project_status"
  ON "scope_alerts" ("project_id", "status");

-- ── 5. Trigger para updated_at automático ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_scope_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scope_alerts_updated_at ON "scope_alerts";
CREATE TRIGGER trg_scope_alerts_updated_at
  BEFORE UPDATE ON "scope_alerts"
  FOR EACH ROW EXECUTE FUNCTION update_scope_alerts_updated_at();
