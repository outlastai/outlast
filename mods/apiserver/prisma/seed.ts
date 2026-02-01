/**
 * Copyright (C) 2026 by Outlast.
 *
 * Database seed script - creates sample data for development/testing.
 * Uses upsert operations with fixed IDs to be idempotent (safe to run multiple times).
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString =
  process.env.OUTLAST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/outlast";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// Fixed UUIDs for idempotent seeding
const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";
const CONTACT_1_ID = "00000000-0000-4000-8000-000000000101";
const CONTACT_2_ID = "00000000-0000-4000-8000-000000000102";
const RECORD_1_ID = "00000000-0000-4000-8000-000000000201";
const RECORD_2_ID = "00000000-0000-4000-8000-000000000202";
const WORKFLOW_ID = "00000000-0000-4000-8000-000000000301";
const RECORD_WORKFLOW_1_ID = "00000000-0000-4000-8000-000000000401";
const RECORD_WORKFLOW_2_ID = "00000000-0000-4000-8000-000000000402";

// Workflow configuration from workflow.example.yaml
const WORKFLOW_CONFIG = {
  name: "Invoice Follow-up Workflow",
  description: "Automated follow-up for unpaid invoices",
  model: "gpt-4o",
  temperature: 0.7,
  systemPrompt: `You are a professional accounts receivable agent.
Follow up on unpaid invoices politely but firmly.`,
  tools: ["sendEmail", "sendCall", "updateRecordStatus", "getRecord", "getRecordHistory"],
  schedule: "*/2 * * * *",
  emailTemplate: `Subject: Follow-up: Invoice {{record.title}}

Dear {{contact.name}},

This is a friendly reminder regarding invoice {{record.title}}.
Current status: {{record.status}}
{{#if record.dueAt}}Due date: {{record.dueAt}}{{/if}}

Please let us know if you have any questions.

Best regards,
{{workspace.name}}`,
  callPrompt: `Call regarding invoice {{record.title}}.
Contact: {{contact.name}}
Amount due information is in the record metadata.
Priority: {{record.priority}}`
};

const SCHEDULER_RULES_CONFIG = {
  minDaysBetweenActions: 3,
  maxActionAttempts: 5,
  enabledStatuses: ["OPEN", "BLOCKED"],
  batchSize: 25
};

async function main() {
  console.log("Seeding database...");

  // Create contacts
  console.log("Creating contacts...");

  const contact1 = await prisma.contact.upsert({
    where: { id: CONTACT_1_ID },
    update: {},
    create: {
      id: CONTACT_1_ID,
      workspaceId: WORKSPACE_ID,
      name: "John Smith",
      email: "john.smith@acmecorp.example.com",
      phone: "+1-555-0101",
      preferredChannel: "EMAIL"
    }
  });
  console.log(`  Contact 1: ${contact1.name} (${contact1.id})`);

  const contact2 = await prisma.contact.upsert({
    where: { id: CONTACT_2_ID },
    update: {},
    create: {
      id: CONTACT_2_ID,
      workspaceId: WORKSPACE_ID,
      name: "Jane Doe",
      email: "jane.doe@betainc.example.com",
      phone: null,
      preferredChannel: "EMAIL"
    }
  });
  console.log(`  Contact 2: ${contact2.name} (${contact2.id})`);

  // Create records
  console.log("Creating records...");

  const record1 = await prisma.record.upsert({
    where: { id: RECORD_1_ID },
    update: {},
    create: {
      id: RECORD_1_ID,
      workspaceId: WORKSPACE_ID,
      type: "GENERIC",
      title: "Invoice #1001 - Acme Corp",
      status: "OPEN",
      priority: "HIGH",
      contactId: CONTACT_1_ID,
      sourceSystem: "MANUAL",
      sourceRecordId: "seed-record-1001",
      metadata: {
        invoiceNumber: "1001",
        amount: 5000,
        currency: "USD"
      }
    }
  });
  console.log(`  Record 1: ${record1.title} (${record1.id})`);

  const record2 = await prisma.record.upsert({
    where: { id: RECORD_2_ID },
    update: {},
    create: {
      id: RECORD_2_ID,
      workspaceId: WORKSPACE_ID,
      type: "GENERIC",
      title: "Invoice #1002 - Beta Inc",
      status: "OPEN",
      priority: "MEDIUM",
      contactId: CONTACT_2_ID,
      sourceSystem: "MANUAL",
      sourceRecordId: "seed-record-1002",
      metadata: {
        invoiceNumber: "1002",
        amount: 2500,
        currency: "USD"
      }
    }
  });
  console.log(`  Record 2: ${record2.title} (${record2.id})`);

  // Create workflow with scheduler rules
  console.log("Creating workflow...");

  const workflow = await prisma.workflow.upsert({
    where: { id: WORKFLOW_ID },
    update: {},
    create: {
      id: WORKFLOW_ID,
      workspaceId: WORKSPACE_ID,
      name: WORKFLOW_CONFIG.name,
      description: WORKFLOW_CONFIG.description,
      model: WORKFLOW_CONFIG.model,
      systemPrompt: WORKFLOW_CONFIG.systemPrompt,
      temperature: WORKFLOW_CONFIG.temperature,
      tools: WORKFLOW_CONFIG.tools,
      schedule: WORKFLOW_CONFIG.schedule,
      emailTemplate: WORKFLOW_CONFIG.emailTemplate,
      callPrompt: WORKFLOW_CONFIG.callPrompt,
      schedulerRules: {
        create: {
          minDaysBetweenActions: SCHEDULER_RULES_CONFIG.minDaysBetweenActions,
          maxActionAttempts: SCHEDULER_RULES_CONFIG.maxActionAttempts,
          enabledStatuses: SCHEDULER_RULES_CONFIG.enabledStatuses,
          batchSize: SCHEDULER_RULES_CONFIG.batchSize
        }
      }
    }
  });
  console.log(`  Workflow: ${workflow.name} (${workflow.id})`);

  // Link records to workflow
  console.log("Linking records to workflow...");

  await prisma.recordWorkflow.upsert({
    where: { id: RECORD_WORKFLOW_1_ID },
    update: {},
    create: {
      id: RECORD_WORKFLOW_1_ID,
      recordId: RECORD_1_ID,
      workflowId: WORKFLOW_ID
    }
  });
  console.log(`  Linked Record 1 to Workflow`);

  await prisma.recordWorkflow.upsert({
    where: { id: RECORD_WORKFLOW_2_ID },
    update: {},
    create: {
      id: RECORD_WORKFLOW_2_ID,
      recordId: RECORD_2_ID,
      workflowId: WORKFLOW_ID
    }
  });
  console.log(`  Linked Record 2 to Workflow`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
