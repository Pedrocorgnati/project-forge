-- Migration: add_prd_document
-- Módulo: module-6-briefforge-prd / TASK-1
-- Design: append-only (sem updatedAt) — imutável por design
-- Aplicar via: npx prisma migrate deploy (requer DIRECT_URL)

-- CreateEnum: PRDStatus
CREATE TYPE "PRDStatus" AS ENUM ('GENERATING', 'READY', 'ERROR');

-- CreateTable: prd_documents
CREATE TABLE "prd_documents" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "brief_id"     UUID NOT NULL,
    "version"      INTEGER NOT NULL,
    "content"      TEXT NOT NULL,
    "generated_by" UUID NOT NULL,
    "status"       "PRDStatus" NOT NULL DEFAULT 'GENERATING',
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- SEM updated_at: design intencional — imutabilidade append-only

    CONSTRAINT "prd_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_prd_documents_brief"          ON "prd_documents"("brief_id");
CREATE INDEX "IDX_prd_documents_brief_version"  ON "prd_documents"("brief_id", "version");
CREATE UNIQUE INDEX "UQ_prd_documents_brief_version" ON "prd_documents"("brief_id", "version");

-- AddForeignKey: prd_documents.brief_id → briefs.id (RESTRICT impede deleção de Brief com PRD)
ALTER TABLE "prd_documents"
    ADD CONSTRAINT "prd_documents_brief_id_fkey"
    FOREIGN KEY ("brief_id")
    REFERENCES "briefs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
