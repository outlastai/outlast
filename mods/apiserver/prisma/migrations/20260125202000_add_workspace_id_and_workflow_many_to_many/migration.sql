/*
  Warnings:

  - Added the required column `workspace_id` to the `records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspace_id` to the `contacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspace_id` to the `workflows` table without a default value. This is not possible if the table is not empty.
  - You are about to drop the column `record_id` on the `workflows` table. All the data in the column will be lost.

*/

-- Alter the Channel enum to remove CHAT and ensure WHATSAPP exists
-- Note: PostgreSQL doesn't support removing enum values directly, so we'll recreate the enum
-- Strategy: Convert to text, recreate enum, then convert back with CHAT -> WHATSAPP mapping
ALTER TABLE "record_history" ALTER COLUMN "channel" TYPE TEXT USING "channel"::TEXT;
ALTER TYPE "Channel" RENAME TO "Channel_old";
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'WEB', 'API', 'MANUAL');
-- Convert CHAT to WHATSAPP, keep other values as-is
ALTER TABLE "record_history" ALTER COLUMN "channel" TYPE "Channel" USING 
  CASE 
    WHEN "channel" = 'CHAT' THEN 'WHATSAPP'::"Channel"
    ELSE "channel"::"Channel"
  END;
DROP TYPE "Channel_old";

-- Alter the PreferredContactMethod enum similarly
ALTER TABLE "contacts" ALTER COLUMN "preferred_contact_method" TYPE TEXT USING "preferred_contact_method"::TEXT;
ALTER TYPE "PreferredContactMethod" RENAME TO "PreferredContactMethod_old";
CREATE TYPE "PreferredContactMethod" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'WHATSAPP');
-- Convert CHAT to WHATSAPP, keep other values as-is
ALTER TABLE "contacts" ALTER COLUMN "preferred_contact_method" TYPE "PreferredContactMethod" USING 
  CASE 
    WHEN "preferred_contact_method" = 'CHAT' THEN 'WHATSAPP'::"PreferredContactMethod"
    ELSE "preferred_contact_method"::"PreferredContactMethod"
  END;
DROP TYPE "PreferredContactMethod_old";

-- Add workspace_id columns as nullable first
ALTER TABLE "records" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "contacts" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "workflows" ADD COLUMN "workspace_id" TEXT;

-- Set a temporary placeholder for existing records
-- NOTE: You must update these with actual workspace IDs after migration
-- Using '00000000-0000-0000-0000-000000000000' as placeholder
UPDATE "records" SET "workspace_id" = '00000000-0000-0000-0000-000000000000' WHERE "workspace_id" IS NULL;
UPDATE "contacts" SET "workspace_id" = '00000000-0000-0000-0000-000000000000' WHERE "workspace_id" IS NULL;
UPDATE "workflows" SET "workspace_id" = '00000000-0000-0000-0000-000000000000' WHERE "workspace_id" IS NULL;

-- Now make workspace_id required
ALTER TABLE "records" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "workflows" ALTER COLUMN "workspace_id" SET NOT NULL;

-- Create the record_workflows junction table
CREATE TABLE "record_workflows" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_workflows_pkey" PRIMARY KEY ("id")
);

-- Migrate existing workflow-record relationships to the junction table
-- Create UUIDs using md5 hash formatted as UUID
INSERT INTO "record_workflows" ("id", "record_id", "workflow_id", "created_at")
SELECT 
    lower(
        substring(md5("record_id" || "id" || "created_at"::text) from 1 for 8) || '-' ||
        substring(md5("record_id" || "id" || "created_at"::text) from 9 for 4) || '-' ||
        '4' || substring(md5("record_id" || "id" || "created_at"::text) from 14 for 3) || '-' ||
        '8' || substring(md5("record_id" || "id" || "created_at"::text) from 18 for 3) || '-' ||
        substring(md5("record_id" || "id" || "created_at"::text) from 22 for 12)
    ) as "id",
    "record_id", 
    "id" as "workflow_id", 
    "created_at"
FROM "workflows"
WHERE "record_id" IS NOT NULL;

-- Create indexes for record_workflows
CREATE INDEX "record_workflows_record_id_idx" ON "record_workflows"("record_id");
CREATE INDEX "record_workflows_workflow_id_idx" ON "record_workflows"("workflow_id");
CREATE UNIQUE INDEX "record_workflows_record_id_workflow_id_key" ON "record_workflows"("record_id", "workflow_id");

-- Add foreign keys for record_workflows
ALTER TABLE "record_workflows" ADD CONSTRAINT "record_workflows_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_workflows" ADD CONSTRAINT "record_workflows_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop the old foreign key and column from workflows
ALTER TABLE "workflows" DROP CONSTRAINT IF EXISTS "workflows_record_id_fkey";
ALTER TABLE "workflows" DROP COLUMN "record_id";

-- Drop the old index on workflows.record_id (if it exists)
DROP INDEX IF EXISTS "workflows_record_id_idx";

-- Add indexes for workspace_id
CREATE INDEX "records_workspace_id_idx" ON "records"("workspace_id");
CREATE INDEX "contacts_workspace_id_idx" ON "contacts"("workspace_id");
CREATE INDEX "workflows_workspace_id_idx" ON "workflows"("workspace_id");
