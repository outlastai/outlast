-- CreateEnum for ItemStatus (if not exists - adding for completeness)
DO $$ BEGIN
    CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'RECEIVED', 'BACKORDERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable for items (if not exists)
CREATE TABLE IF NOT EXISTS "items" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for items (if not exists)
CREATE INDEX IF NOT EXISTS "items_record_id_idx" ON "items"("record_id");
CREATE INDEX IF NOT EXISTS "items_status_idx" ON "items"("status");

-- AddForeignKey for items (if not exists)
DO $$ BEGIN
    ALTER TABLE "items" ADD CONSTRAINT "items_record_id_fkey" 
    FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropColumn static_rules from workflows (if exists)
ALTER TABLE "workflows" DROP COLUMN IF EXISTS "static_rules";

-- CreateTable for workflow_scheduler_rules
CREATE TABLE "workflow_scheduler_rules" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "min_days_between_actions" INTEGER NOT NULL DEFAULT 3,
    "max_action_attempts" INTEGER NOT NULL DEFAULT 5,
    "record_too_recent_days" INTEGER NOT NULL DEFAULT 1,
    "recent_update_cooldown_days" INTEGER NOT NULL DEFAULT 1,
    "escalation_threshold" INTEGER NOT NULL DEFAULT 3,
    "high_priority_min_days" INTEGER NOT NULL DEFAULT 1,
    "low_priority_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "enabled_statuses" JSONB NOT NULL DEFAULT '["OPEN"]',
    "batch_size" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_scheduler_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_scheduler_rules_workflow_id_key" ON "workflow_scheduler_rules"("workflow_id");

-- AddForeignKey
ALTER TABLE "workflow_scheduler_rules" ADD CONSTRAINT "workflow_scheduler_rules_workflow_id_fkey" 
FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
