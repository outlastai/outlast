-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('PENDING', 'RUNNING', 'INTERRUPTED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "config_name" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'PENDING',
    "initial_data" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_ref_mapping" (
    "call_ref" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "workflow_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_ref_mapping_pkey" PRIMARY KEY ("call_ref")
);

-- CreateIndex
CREATE INDEX "workflow_runs_workspace_id_idx" ON "workflow_runs"("workspace_id");

-- CreateIndex
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");

-- CreateIndex
CREATE INDEX "workflow_runs_record_id_idx" ON "workflow_runs"("record_id");

-- CreateIndex
CREATE INDEX "workflow_runs_thread_id_idx" ON "workflow_runs"("thread_id");

-- CreateIndex
CREATE INDEX "call_ref_mapping_thread_id_idx" ON "call_ref_mapping"("thread_id");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_ref_mapping" ADD CONSTRAINT "call_ref_mapping_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
