DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role') THEN
    CREATE TYPE "role" AS ENUM ('USER', 'WORKSPACE_ADMIN', 'WORKSPACE_OWNER', 'WORKSPACE_MEMBER');
  END IF;

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
