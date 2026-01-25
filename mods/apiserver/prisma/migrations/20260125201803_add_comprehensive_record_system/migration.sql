/*
  Warnings:

  - Added the required column `source_system` to the `records` table without a default value. This is not possible if the table is not empty.

*/
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
CREATE TYPE "PreferredContactMethod" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'CHAT');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('EMAIL', 'PHONE', 'CHAT', 'WEB', 'API', 'MANUAL');

-- AlterTable
-- First add nullable columns
ALTER TABLE "records" ADD COLUMN     "contact_id" TEXT,
ADD COLUMN     "due_at" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" "PriorityLevel",
ADD COLUMN     "raw_data" JSONB,
ADD COLUMN     "risk" "RiskLevel",
ADD COLUMN     "source_record_id" TEXT,
ADD COLUMN     "source_system" "SourceSystem",
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "type" "RecordType" NOT NULL DEFAULT 'GENERIC';

-- Set default value for existing records
UPDATE "records" SET "source_system" = 'MANUAL' WHERE "source_system" IS NULL;

-- Now make source_system required
ALTER TABLE "records" ALTER COLUMN "source_system" SET NOT NULL;

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
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "preferred_contact_method" "PreferredContactMethod",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "record_history_record_id_idx" ON "record_history"("record_id");

-- CreateIndex
CREATE INDEX "record_history_created_at_idx" ON "record_history"("created_at");

-- CreateIndex
CREATE INDEX "contacts_email_idx" ON "contacts"("email");

-- CreateIndex
CREATE INDEX "contacts_phone_idx" ON "contacts"("phone");

-- CreateIndex
CREATE INDEX "workflows_record_id_idx" ON "workflows"("record_id");

-- CreateIndex
CREATE INDEX "records_type_idx" ON "records"("type");

-- CreateIndex
CREATE INDEX "records_status_idx" ON "records"("status");

-- CreateIndex
CREATE INDEX "records_contact_id_idx" ON "records"("contact_id");

-- CreateIndex
CREATE INDEX "records_source_system_source_record_id_idx" ON "records"("source_system", "source_record_id");

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_history" ADD CONSTRAINT "record_history_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
