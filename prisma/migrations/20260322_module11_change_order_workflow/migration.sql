-- ─── Migration: module-11-scopeshield-change-orders ─────────────────────────
-- Adiciona PENDING_APPROVAL ao enum ChangeOrderStatus
-- Adiciona campos de workflow de aprovação ao ChangeOrder
-- Torna impactTier e scopeImpact opcionais
-- Adiciona hourlyRate, baseHours, totalHours ao Project
-- Rastreabilidade: INT-072, INT-075

-- 1. Adicionar PENDING_APPROVAL ao enum ChangeOrderStatus (PostgreSQL)
ALTER TYPE "ChangeOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

-- 2. Adicionar campos de workflow ao change_orders
ALTER TABLE "change_orders"
  ADD COLUMN IF NOT EXISTS "approved_by"      UUID,
  ADD COLUMN IF NOT EXISTS "approved_at"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "rejected_by"      UUID,
  ADD COLUMN IF NOT EXISTS "rejected_at"      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

-- 3. Tornar impact_tier e scope_impact opcionais (nullable)
ALTER TABLE "change_orders"
  ALTER COLUMN "impact_tier"  DROP NOT NULL,
  ALTER COLUMN "scope_impact" DROP NOT NULL;

-- 4. Definir defaults para hours_impact e cost_impact
ALTER TABLE "change_orders"
  ALTER COLUMN "hours_impact" SET DEFAULT 0,
  ALTER COLUMN "cost_impact"  SET DEFAULT 0;

-- 5. Adicionar hourlyRate, baseHours, totalHours ao projects
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "hourly_rate" DECIMAL(10, 2) NOT NULL DEFAULT 210,
  ADD COLUMN IF NOT EXISTS "base_hours"  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_hours" DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 6. Índice para COs pendentes por projeto
CREATE INDEX IF NOT EXISTS "IDX_change_orders_pending"
  ON "change_orders" ("project_id", "status");
