-- Migration: RLS policies for 16 additional models
-- Resolves: REFORGE Gap #4 — Models without verified RLS
-- Date: 2026-03-23

-- ─── ENABLE RLS ON ALL TABLES ─────────────────────────────────────────────────

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BriefQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentAccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstimateItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstimateVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ScopeValidation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangeOrderTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProfitReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CostRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectCostRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientFeedback" ENABLE ROW LEVEL SECURITY;

-- ─── SERVICE ROLE BYPASS ──────────────────────────────────────────────────────
-- Prisma connects via service role — bypass RLS for server-side operations

CREATE POLICY "service_role_bypass_organization" ON "Organization"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_project_member" ON "ProjectMember"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_brief_question" ON "BriefQuestion"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_document_access_log" ON "DocumentAccessLog"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_document_version" ON "DocumentVersion"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_estimate_item" ON "EstimateItem"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_estimate_version" ON "EstimateVersion"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_project_category" ON "ProjectCategory"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_scope_validation" ON "ScopeValidation"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_change_order_task" ON "ChangeOrderTask"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_profit_report" ON "ProfitReport"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_cost_override" ON "CostOverride"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_cost_rate" ON "CostRate"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_project_cost_rate" ON "ProjectCostRate"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_approval_history" ON "ApprovalHistory"
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_client_feedback" ON "ClientFeedback"
  FOR ALL USING (auth.role() = 'service_role');

-- ─── ORGANIZATION-SCOPED POLICIES ────────────────────────────────────────────
-- Users can only access data within their organization

CREATE POLICY "org_isolation_organization" ON "Organization"
  FOR SELECT USING (
    id IN (SELECT "organizationId" FROM "User" WHERE id = auth.uid()::text)
  );

CREATE POLICY "org_isolation_project_member" ON "ProjectMember"
  FOR ALL USING (
    "projectId" IN (
      SELECT p.id FROM "Project" p
      JOIN "User" u ON u."organizationId" = p."organizationId"
      WHERE u.id = auth.uid()::text
    )
  );

-- ─── PROJECT-SCOPED POLICIES ─────────────────────────────────────────────────
-- Access follows project membership chain

CREATE POLICY "project_scope_brief_question" ON "BriefQuestion"
  FOR ALL USING (
    "briefId" IN (
      SELECT b.id FROM "Brief" b
      JOIN "ProjectMember" pm ON pm."projectId" = b."projectId"
      JOIN "User" u ON u.id = pm."userId"
      WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_document_access_log" ON "DocumentAccessLog"
  FOR ALL USING (
    "documentId" IN (
      SELECT d.id FROM "Document" d
      JOIN "ProjectMember" pm ON pm."projectId" = d."projectId"
      JOIN "User" u ON u.id = pm."userId"
      WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_document_version" ON "DocumentVersion"
  FOR ALL USING (
    "documentId" IN (
      SELECT d.id FROM "Document" d
      JOIN "ProjectMember" pm ON pm."projectId" = d."projectId"
      JOIN "User" u ON u.id = pm."userId"
      WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_estimate_item" ON "EstimateItem"
  FOR ALL USING (
    "estimateId" IN (
      SELECT e.id FROM "Estimate" e
      JOIN "ProjectMember" pm ON pm."projectId" = e."projectId"
      JOIN "User" u ON u.id = pm."userId"
      WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_estimate_version" ON "EstimateVersion"
  FOR ALL USING (
    "estimateId" IN (
      SELECT e.id FROM "Estimate" e
      JOIN "ProjectMember" pm ON pm."projectId" = e."projectId"
      JOIN "User" u ON u.id = pm."userId"
      WHERE u.id = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_scope_validation" ON "ScopeValidation"
  FOR ALL USING (
    "projectId" IN (
      SELECT pm."projectId" FROM "ProjectMember" pm
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_change_order_task" ON "ChangeOrderTask"
  FOR ALL USING (
    "changeOrderId" IN (
      SELECT co.id FROM "ChangeOrder" co
      JOIN "ProjectMember" pm ON pm."projectId" = co."projectId"
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_profit_report" ON "ProfitReport"
  FOR ALL USING (
    "projectId" IN (
      SELECT pm."projectId" FROM "ProjectMember" pm
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_cost_override" ON "CostOverride"
  FOR ALL USING (
    "costConfigId" IN (
      SELECT cc.id FROM "CostConfig" cc
      JOIN "ProjectMember" pm ON pm."projectId" = cc."projectId"
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_cost_rate" ON "CostRate"
  FOR ALL USING (
    "costConfigId" IN (
      SELECT cc.id FROM "CostConfig" cc
      JOIN "ProjectMember" pm ON pm."projectId" = cc."projectId"
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_project_cost_rate" ON "ProjectCostRate"
  FOR ALL USING (
    "projectId" IN (
      SELECT pm."projectId" FROM "ProjectMember" pm
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_approval_history" ON "ApprovalHistory"
  FOR ALL USING (
    "approvalRequestId" IN (
      SELECT ar.id FROM "ApprovalRequest" ar
      JOIN "ProjectMember" pm ON pm."projectId" = ar."projectId"
      WHERE pm."userId" = auth.uid()::text
    )
  );

CREATE POLICY "project_scope_client_feedback" ON "ClientFeedback"
  FOR ALL USING (
    "projectId" IN (
      SELECT pm."projectId" FROM "ProjectMember" pm
      WHERE pm."userId" = auth.uid()::text
    )
  );

-- ─── PUBLIC/REFERENCE TABLES ─────────────────────────────────────────────────

CREATE POLICY "public_read_project_category" ON "ProjectCategory"
  FOR SELECT USING (true);
