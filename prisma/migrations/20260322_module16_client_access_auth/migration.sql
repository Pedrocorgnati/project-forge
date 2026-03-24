-- Migration: module-16-clientportal-auth
-- Adds status, inviteToken (rename token), invitedBy, revokedAt, updatedAt to client_accesses
-- Rastreabilidade: INT-102

-- 1. Create ClientAccessStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClientAccessStatus') THEN
    CREATE TYPE "ClientAccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
  END IF;
END$$;

-- 2. Rename column token → invite_token
ALTER TABLE client_accesses RENAME COLUMN token TO invite_token;

-- 3. Add status column with default PENDING
ALTER TABLE client_accesses
  ADD COLUMN IF NOT EXISTS status "ClientAccessStatus" NOT NULL DEFAULT 'PENDING';

-- 4. Add invited_by column (nullable FK to users.id)
ALTER TABLE client_accesses
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 5. Add revoked_at column
ALTER TABLE client_accesses
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- 6. Add updated_at column (initialize with invited_at value)
ALTER TABLE client_accesses
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 7. Update index name to reflect column rename
DROP INDEX IF EXISTS "IDX_client_access_token";
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_client_access_token" ON client_accesses(invite_token);

-- 8. Add email index
CREATE INDEX IF NOT EXISTS "IDX_client_access_email" ON client_accesses(client_email);
