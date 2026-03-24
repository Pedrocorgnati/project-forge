-- Migration: module-17-clientportal-approvals
-- Rastreabilidade: INT-105, INT-106, INT-107, INT-108, INT-111, INT-112

-- ─────────────────────────────────────────────────────────────
-- APPROVAL REQUESTS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE approval_requests (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL,
  client_access_id UUID        NOT NULL,
  requested_by     UUID        NOT NULL,
  type             VARCHAR(30) NOT NULL CHECK (type IN ('DOCUMENT', 'MILESTONE', 'DELIVERABLE')),
  title            VARCHAR(200) NOT NULL,
  description      TEXT        NOT NULL,
  document_id      UUID,
  document_type    TEXT,                         -- nullable (enum cast from DocumentType when present)
  status           VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
  sla_deadline     TIMESTAMPTZ NOT NULL,
  responded_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_approval_requests PRIMARY KEY (id),
  CONSTRAINT fk_approval_requests_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_requests_client_access
    FOREIGN KEY (client_access_id) REFERENCES client_accesses(id),
  CONSTRAINT fk_approval_requests_requested_by
    FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_approval_requests_document
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX IDX_approval_requests_project_status_sla
  ON approval_requests (project_id, status, sla_deadline);

CREATE INDEX IDX_approval_requests_client_access
  ON approval_requests (client_access_id);

-- auto-update updated_at
CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- APPROVAL HISTORY (immutable audit trail)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE approval_history (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  approval_request_id UUID        NOT NULL,
  action              VARCHAR(50) NOT NULL,  -- CREATED | REMINDER_SENT | APPROVED | REJECTED | EXPIRED | CANCELLED
  comment             TEXT,
  actor_id            UUID,                  -- NULL para ações automáticas do sistema (cron)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_approval_history PRIMARY KEY (id),
  CONSTRAINT fk_approval_history_request
    FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE
);

CREATE INDEX IDX_approval_history_request
  ON approval_history (approval_request_id);

-- ─────────────────────────────────────────────────────────────
-- CLIENT FEEDBACK
-- ─────────────────────────────────────────────────────────────

CREATE TABLE client_feedback (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL,
  client_access_id UUID        NOT NULL,
  content          TEXT        NOT NULL,
  category         VARCHAR(30) NOT NULL DEFAULT 'GENERAL'
                   CHECK (category IN ('GENERAL', 'APPROVAL', 'CONCERN')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pk_client_feedback PRIMARY KEY (id),
  CONSTRAINT fk_client_feedback_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_client_feedback_client_access
    FOREIGN KEY (client_access_id) REFERENCES client_accesses(id)
);

CREATE INDEX IDX_client_feedback_project
  ON client_feedback (project_id);

CREATE INDEX IDX_client_feedback_client_access
  ON client_feedback (client_access_id);
