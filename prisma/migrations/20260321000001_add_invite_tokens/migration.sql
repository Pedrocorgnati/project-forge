-- CreateTable: invite_tokens
-- Módulo: module-3-auth-and-rbac / TASK-4

CREATE TABLE "invite_tokens" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "email"      VARCHAR(255) NOT NULL,
    "role"       "UserRole" NOT NULL,
    "token"      UUID NOT NULL DEFAULT gen_random_uuid(),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at"    TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");
CREATE INDEX "IDX_invite_token" ON "invite_tokens"("token");
CREATE INDEX "IDX_invite_email" ON "invite_tokens"("email");
