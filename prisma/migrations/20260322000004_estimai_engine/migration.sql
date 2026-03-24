-- Migration: estimai_engine
-- Módulo: module-7-estimai-engine / TASK-1
-- Aplicar via: npx prisma migrate deploy (requer DIRECT_URL)

-- ── 1. Criar enum ConfidenceLevel ─────────────────────────────────────────────
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- ── 2. Atualizar enum EstimateStatus ──────────────────────────────────────────
-- Passo 1: criar novo enum
CREATE TYPE "EstimateStatus_new" AS ENUM ('GENERATING', 'READY', 'ARCHIVED');

-- Passo 2: dropar coluna antiga (sem dados de prod a preservar)
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "status";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "confidence";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "project_category";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "project_size";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "stack_tags";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "min_hours";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "max_hours";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "buffer_percent";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "source";
ALTER TABLE "estimates" DROP COLUMN IF EXISTS "breakdown";

-- Passo 3: dropar enum antigo e renomear novo
DROP TYPE IF EXISTS "EstimateStatus";
ALTER TYPE "EstimateStatus_new" RENAME TO "EstimateStatus";

-- ── 3. Adicionar novas colunas em estimates ────────────────────────────────────
ALTER TABLE "estimates"
    ADD COLUMN IF NOT EXISTS "brief_id"       UUID,
    ADD COLUMN IF NOT EXISTS "total_min"      DECIMAL(10, 2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "total_max"      DECIMAL(10, 2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "currency"       VARCHAR(3)      NOT NULL DEFAULT 'BRL',
    ADD COLUMN IF NOT EXISTS "confidence"     "ConfidenceLevel" NOT NULL DEFAULT 'LOW',
    ADD COLUMN IF NOT EXISTS "status"         "EstimateStatus"  NOT NULL DEFAULT 'GENERATING',
    ADD COLUMN IF NOT EXISTS "ai_prompt"      TEXT,
    ADD COLUMN IF NOT EXISTS "ai_raw_response" TEXT,
    ADD COLUMN IF NOT EXISTS "updated_at"     TIMESTAMPTZ     NOT NULL DEFAULT now();

-- FK: estimates.brief_id → briefs.id
ALTER TABLE "estimates"
    ADD CONSTRAINT "estimates_brief_id_fkey"
    FOREIGN KEY ("brief_id")
    REFERENCES "briefs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "IDX_estimates_brief"          ON "estimates"("brief_id");
CREATE INDEX IF NOT EXISTS "IDX_estimates_project_status" ON "estimates"("project_id", "status");

-- ── 4. Atualizar tabela estimate_items ────────────────────────────────────────
ALTER TABLE "estimate_items"
    DROP COLUMN IF EXISTS "min_hours",
    DROP COLUMN IF EXISTS "max_hours",
    DROP COLUMN IF EXISTS "notes";

ALTER TABLE "estimate_items"
    ADD COLUMN IF NOT EXISTS "hours_min"    DECIMAL(8, 2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "hours_max"    DECIMAL(8, 2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "hourly_rate"  DECIMAL(10, 2) NOT NULL DEFAULT 210,
    ADD COLUMN IF NOT EXISTS "risk_factor"  DECIMAL(4, 2)  NOT NULL DEFAULT 1.0,
    ADD COLUMN IF NOT EXISTS "cost_min"     DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "cost_max"     DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Alterar description para TEXT (se era VARCHAR)
ALTER TABLE "estimate_items"
    ALTER COLUMN "description" TYPE TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS "IDX_estimate_items_category" ON "estimate_items"("estimate_id", "category");

-- ── 5. Adicionar reason em estimate_versions ──────────────────────────────────
ALTER TABLE "estimate_versions"
    ADD COLUMN IF NOT EXISTS "reason" TEXT;

-- ── 6. Recriar tabela benchmarks ──────────────────────────────────────────────
DROP TABLE IF EXISTS "benchmarks";

CREATE TABLE "benchmarks" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "category"    VARCHAR(100) NOT NULL,
    "subcategory" VARCHAR(100),
    "avg_hours"   DECIMAL(8, 2) NOT NULL,
    "p25"         DECIMAL(8, 2) NOT NULL,
    "p75"         DECIMAL(8, 2) NOT NULL,
    "source"      VARCHAR(100) NOT NULL,
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "benchmarks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_benchmarks_category"     ON "benchmarks"("category");
CREATE INDEX "IDX_benchmarks_category_sub" ON "benchmarks"("category", "subcategory");

-- ── 7. Recriar tabela project_categories ─────────────────────────────────────
DROP TABLE IF EXISTS "project_categories";

CREATE TABLE "project_categories" (
    "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"      VARCHAR(100) NOT NULL,
    "slug"      VARCHAR(100) NOT NULL,
    "parent_id" UUID,

    CONSTRAINT "project_categories_pkey"        PRIMARY KEY ("id"),
    CONSTRAINT "project_categories_slug_unique"  UNIQUE ("slug"),
    CONSTRAINT "project_categories_parent_fkey"  FOREIGN KEY ("parent_id")
        REFERENCES "project_categories"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
);
