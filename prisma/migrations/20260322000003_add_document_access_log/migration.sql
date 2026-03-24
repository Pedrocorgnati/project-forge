-- Migration: add_document_access_log
-- Módulo: module-6-briefforge-prd / TASK-3
-- Propósito: Audit trail de acesso a documentos PRD (fire-and-forget)

CREATE TABLE "document_access_logs" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "accessed_by" UUID NOT NULL,
    "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "action"      VARCHAR(20) NOT NULL DEFAULT 'VIEW',
    "ip_address"  VARCHAR(45),
    "user_agent"  VARCHAR(512),

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes para consulta rápida por documento, usuário e data
CREATE INDEX "IDX_doc_access_log_document" ON "document_access_logs"("document_id");
CREATE INDEX "IDX_doc_access_log_user"     ON "document_access_logs"("accessed_by");
CREATE INDEX "IDX_doc_access_log_time"     ON "document_access_logs"("accessed_at");
