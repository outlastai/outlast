-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('GENERIC', 'PURCHASE_ORDER', 'INVENTORY_ITEM', 'INVOICE', 'SHIPMENT', 'TICKET', 'RETURN');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('OPEN', 'DONE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('CSV', 'ODOO', 'SALESFORCE', 'SAP', 'EMAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'WHATSAPP');

-- CreateTable
CREATE TABLE "records" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "type" "RecordType" NOT NULL DEFAULT 'GENERIC',
    "title" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'OPEN',
    "risk" "RiskLevel",
    "priority" "PriorityLevel",
    "contact_id" TEXT,
    "due_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_record_id" TEXT,
    "metadata" JSONB,
    "raw_data" JSONB,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_history" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL,
    "ai_note" TEXT,
    "human_note" TEXT,
    "agent" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "channel_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "preferred_contact_method" "Channel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "model" TEXT,
    "system_prompt" TEXT,
    "temperature" DOUBLE PRECISION,
    "tools" JSONB,
    "static_rules" JSONB,
    "schedule" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_workflows" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "records_workspace_id_idx" ON "records"("workspace_id");

-- CreateIndex
CREATE INDEX "records_type_idx" ON "records"("type");

-- CreateIndex
CREATE INDEX "records_status_idx" ON "records"("status");

-- CreateIndex
CREATE INDEX "records_contact_id_idx" ON "records"("contact_id");

-- CreateIndex
CREATE INDEX "records_source_system_source_record_id_idx" ON "records"("source_system", "source_record_id");

-- CreateIndex
CREATE INDEX "record_history_record_id_idx" ON "record_history"("record_id");

-- CreateIndex
CREATE INDEX "record_history_created_at_idx" ON "record_history"("created_at");

-- CreateIndex
CREATE INDEX "contacts_workspace_id_idx" ON "contacts"("workspace_id");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

-- CreateIndex
CREATE INDEX "workflows_workspace_id_idx" ON "workflows"("workspace_id");

-- CreateIndex
CREATE INDEX "record_workflows_record_id_idx" ON "record_workflows"("record_id");

-- CreateIndex
CREATE INDEX "record_workflows_workflow_id_idx" ON "record_workflows"("workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "record_workflows_record_id_workflow_id_key" ON "record_workflows"("record_id", "workflow_id");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_history" ADD CONSTRAINT "record_history_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_workflows" ADD CONSTRAINT "record_workflows_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_workflows" ADD CONSTRAINT "record_workflows_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
