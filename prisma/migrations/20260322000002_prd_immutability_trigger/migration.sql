-- Migration: prd_immutability_trigger
-- Módulo: module-6-briefforge-prd / TASK-3
-- Propósito: Garantir imutabilidade em nível de banco — bloqueia UPDATE/DELETE estruturais
-- Aplicar via: Supabase SQL Editor ou psql $DIRECT_URL -f migration.sql
-- NOTA: Este arquivo é DDL de trigger — aplicar APÓS 20260322000001_add_prd_document

-- Função do trigger: bloqueia UPDATE estrutural e DELETE
CREATE OR REPLACE FUNCTION prevent_prd_document_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'prd_documents is immutable: DELETE is not allowed (id: %)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Permite apenas mudança de status (GENERATING → READY | ERROR) e content
    -- Não permite alterar: version, brief_id, generated_by, created_at

    IF OLD.version != NEW.version THEN
      RAISE EXCEPTION
        'prd_documents is immutable: version cannot be changed (id: %)', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;

    IF OLD.brief_id != NEW.brief_id THEN
      RAISE EXCEPTION
        'prd_documents is immutable: brief_id cannot be changed (id: %)', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;

    IF OLD.generated_by != NEW.generated_by THEN
      RAISE EXCEPTION
        'prd_documents is immutable: generated_by cannot be changed (id: %)', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;

    IF OLD.created_at != NEW.created_at THEN
      RAISE EXCEPTION
        'prd_documents is immutable: created_at cannot be changed (id: %)', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;

    -- Bloqueia mudança de content em documento READY (conteúdo já aprovado)
    IF OLD.status = 'READY' AND OLD.content != NEW.content THEN
      RAISE EXCEPTION
        'prd_documents is immutable: content cannot be changed after READY (id: %)', OLD.id
        USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE UPDATE OR DELETE em prd_documents
CREATE TRIGGER prd_documents_immutability_guard
  BEFORE UPDATE OR DELETE ON prd_documents
  FOR EACH ROW
  EXECUTE FUNCTION prevent_prd_document_mutation();

-- Comentário explicativo
COMMENT ON TRIGGER prd_documents_immutability_guard ON prd_documents
  IS 'Garante imutabilidade estrutural: bloqueia UPDATE de version/brief_id/generated_by/created_at e todos os DELETEs. Permite apenas mudança de status/content em documentos não-READY.';
