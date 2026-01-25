BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationType') THEN
    CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'PHONE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_member_status') THEN
    CREATE TYPE "workspace_member_status" AS ENUM ('PENDING', 'ACTIVE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE "role" AS ENUM ('USER', 'WORKSPACE_ADMIN', 'WORKSPACE_OWNER', 'WORKSPACE_MEMBER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "ref" TEXT NOT NULL,
  "access_key_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(60) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "email_verified" BOOLEAN NOT NULL DEFAULT false,
  "password_hash" TEXT NOT NULL,
  "phone_number" VARCHAR(20),
  "phone_number_verified" BOOLEAN NOT NULL DEFAULT false,
  "avatar" VARCHAR(255),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "extended" JSONB,
  CONSTRAINT "users_pkey" PRIMARY KEY ("ref")
);

CREATE TABLE IF NOT EXISTS "workspaces" (
  "ref" TEXT NOT NULL,
  "access_key_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(60) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "owner_ref" TEXT NOT NULL,
  CONSTRAINT "workspaces_pkey" PRIMARY KEY ("ref")
);

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "ref" TEXT NOT NULL,
  "status" "workspace_member_status" NOT NULL DEFAULT 'PENDING',
  "role" "role" NOT NULL DEFAULT 'WORKSPACE_MEMBER',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_ref" TEXT NOT NULL,
  "workspace_ref" TEXT NOT NULL,
  CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("ref")
);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "ref" TEXT NOT NULL,
  "access_key_id" VARCHAR(255) NOT NULL,
  "access_key_secret" VARCHAR(255) NOT NULL,
  "role" "role" NOT NULL DEFAULT 'WORKSPACE_MEMBER',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3),
  "workspace_ref" TEXT NOT NULL,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("ref")
);

CREATE TABLE IF NOT EXISTS "verification_codes" (
  "ref" TEXT NOT NULL,
  "type" "VerificationType" NOT NULL,
  "code" VARCHAR(6) NOT NULL,
  "value" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("ref")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_access_key_id_key" ON "users"("access_key_id");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING HASH ("email");
CREATE INDEX IF NOT EXISTS "users_access_key_id_idx" ON "users" USING HASH ("access_key_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_access_key_id_key" ON "workspaces"("access_key_id");
CREATE INDEX IF NOT EXISTS "workspaces_access_key_id_idx" ON "workspaces" USING HASH ("access_key_id");
CREATE INDEX IF NOT EXISTS "workspaces_owner_ref_idx" ON "workspaces" USING HASH ("owner_ref");

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_user_ref_workspace_ref_key"
  ON "workspace_members"("user_ref", "workspace_ref");

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_access_key_id_key" ON "api_keys"("access_key_id");
CREATE INDEX IF NOT EXISTS "api_keys_access_key_id_idx" ON "api_keys" USING HASH ("access_key_id");
CREATE INDEX IF NOT EXISTS "api_keys_workspace_ref_idx" ON "api_keys" USING HASH ("workspace_ref");

CREATE INDEX IF NOT EXISTS "verification_codes_code_idx" ON "verification_codes" USING HASH ("code");

ALTER TABLE IF EXISTS "users"
  ADD COLUMN IF NOT EXISTS "extended" JSONB;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_role') THEN
    ALTER TABLE "api_keys"
      ALTER COLUMN "role" TYPE "role"
      USING (
        CASE "role"
          WHEN 'WORKSPACE_ADMIN' THEN 'WORKSPACE_ADMIN'::"role"
          ELSE 'WORKSPACE_MEMBER'::"role"
        END
      );
    DROP TYPE IF EXISTS "api_key_role";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_member_role') THEN
    ALTER TABLE "workspace_members"
      ALTER COLUMN "role" TYPE "role"
      USING (
        CASE "role"
          WHEN 'OWNER' THEN 'WORKSPACE_OWNER'::"role"
          WHEN 'ADMIN' THEN 'WORKSPACE_ADMIN'::"role"
          ELSE 'WORKSPACE_MEMBER'::"role"
        END
      );
    DROP TYPE IF EXISTS "workspace_member_role";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_owner_ref_fkey'
  ) THEN
    ALTER TABLE "workspaces"
      ADD CONSTRAINT "workspaces_owner_ref_fkey"
      FOREIGN KEY ("owner_ref") REFERENCES "users"("ref")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_user_ref_fkey'
  ) THEN
    ALTER TABLE "workspace_members"
      ADD CONSTRAINT "workspace_members_user_ref_fkey"
      FOREIGN KEY ("user_ref") REFERENCES "users"("ref")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_workspace_ref_fkey'
  ) THEN
    ALTER TABLE "workspace_members"
      ADD CONSTRAINT "workspace_members_workspace_ref_fkey"
      FOREIGN KEY ("workspace_ref") REFERENCES "workspaces"("ref")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_workspace_ref_fkey'
  ) THEN
    ALTER TABLE "api_keys"
      ADD CONSTRAINT "api_keys_workspace_ref_fkey"
      FOREIGN KEY ("workspace_ref") REFERENCES "workspaces"("ref")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
