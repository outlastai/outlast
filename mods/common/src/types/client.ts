/**
 * Copyright (C) 2026 by Outlast.
 */

/**
 * Generic JSON object type for metadata fields.
 */
export type JsonObject = { [key: string]: unknown };

// =============================================================================
// Enums
// =============================================================================

export type RecordTypeValue =
  | "GENERIC"
  | "PURCHASE_ORDER"
  | "INVENTORY_ITEM"
  | "INVOICE"
  | "SHIPMENT"
  | "TICKET"
  | "RETURN";

export type RecordStatusValue = "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";

export type RiskLevelValue = "LOW" | "MEDIUM" | "HIGH";

export type PriorityLevelValue = "LOW" | "MEDIUM" | "HIGH";

export type SourceSystemValue = "CSV" | "ODOO" | "SALESFORCE" | "SAP" | "EMAIL" | "MANUAL";

export type ChannelValue = "EMAIL" | "PHONE" | "SMS" | "WHATSAPP";

// =============================================================================
// Record Types
// =============================================================================

/**
 * Record entity type matching the Prisma model.
 */
export interface RecordEntity {
  id: string;
  workspaceId: string;
  type: RecordTypeValue;
  title: string;
  status: RecordStatusValue;
  risk: RiskLevelValue | null;
  priority: PriorityLevelValue | null;
  contactId: string | null;
  dueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sourceSystem: SourceSystemValue;
  sourceRecordId: string | null;
  metadata: JsonObject | null;
  rawData: JsonObject | null;
}

/**
 * @deprecated Use RecordEntity instead.
 */
export type Record = RecordEntity;

/**
 * Record create input type.
 */
export interface RecordCreateInput {
  workspaceId: string;
  title: string;
  type: RecordTypeValue;
  sourceSystem: SourceSystemValue;
  sourceRecordId: string;
  status?: RecordStatusValue;
  priority?: PriorityLevelValue | null;
  risk?: RiskLevelValue | null;
  contactId?: string | null;
  dueAt?: Date | null;
  metadata?: JsonObject | null;
  rawData?: JsonObject | null;
}

/**
 * Record update input type.
 * Only these fields are updatable; type and sourceSystem/sourceRecordId are set at creation only.
 */
export interface RecordUpdateInput {
  title?: string;
  status?: RecordStatusValue;
  risk?: RiskLevelValue | null;
  priority?: PriorityLevelValue | null;
  contactId?: string | null;
  dueAt?: Date | null;
  metadata?: JsonObject | null;
  rawData?: JsonObject | null;
}

// =============================================================================
// Contact Types
// =============================================================================

/**
 * Contact entity type matching the Prisma model.
 */
export interface Contact {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredChannel: ChannelValue;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact create input type.
 */
export interface ContactCreateInput {
  workspaceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  preferredChannel: ChannelValue;
}

// =============================================================================
// Workflow Types
// =============================================================================

/**
 * Workflow entity type matching the Prisma model.
 */
export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  tools: unknown[] | null;
  schedule: string | null;
  emailTemplate: string | null;
  callPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Workflow create input type.
 */
export interface WorkflowCreateInput {
  workspaceId: string;
  name: string;
  description?: string | null;
  model?: string | null;
  systemPrompt?: string | null;
  temperature?: number | null;
  tools?: unknown[] | null;
  schedule?: string | null;
  emailTemplate?: string | null;
  callPrompt?: string | null;
}

/**
 * Workflow update input type.
 */
export interface WorkflowUpdateInput {
  name?: string;
  description?: string | null;
  model?: string | null;
  systemPrompt?: string | null;
  temperature?: number | null;
  tools?: unknown[] | null;
  schedule?: string | null;
  emailTemplate?: string | null;
  callPrompt?: string | null;
}

// =============================================================================
// RecordHistory Types
// =============================================================================

/**
 * RecordHistory entity type matching the Prisma model.
 */
export interface RecordHistory {
  id: string;
  recordId: string;
  status: RecordStatusValue;
  aiNote: string | null;
  humanNote: string | null;
  agent: string;
  channel: ChannelValue;
  channelMetadata: JsonObject | null;
  createdAt: Date;
}

// =============================================================================
// WorkflowRun Types (LangGraph)
// =============================================================================

export type WorkflowRunStatusValue = "PENDING" | "RUNNING" | "INTERRUPTED" | "COMPLETED" | "FAILED";

/**
 * WorkflowRun entity type matching the Prisma model.
 */
export interface WorkflowRun {
  id: string;
  workspaceId: string;
  recordId: string;
  configName: string;
  threadId: string;
  status: WorkflowRunStatusValue;
  initialData: JsonObject | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * WorkflowRun create input type.
 */
export interface WorkflowRunCreateInput {
  workspaceId: string;
  recordId: string;
  configName: string;
  initialData?: JsonObject | null;
}

// =============================================================================
// Database Client Interface
// =============================================================================

/**
 * Database client interface for dependency injection.
 * This interface abstracts the Prisma client for testing and flexibility.
 */
export interface DbClient {
  record: {
    create: (args: { data: RecordCreateInput }) => Promise<RecordEntity>;
    findMany: (args?: {
      skip?: number;
      take?: number;
      where?: { workspaceId?: string; status?: RecordStatusValue; type?: RecordTypeValue };
    }) => Promise<RecordEntity[]>;
    findFirst: (args: {
      where: { workspaceId?: string; sourceRecordId?: string; id?: string };
    }) => Promise<RecordEntity | null>;
    findUnique: (args: { where: { id: string } }) => Promise<RecordEntity | null>;
    update: (args: { where: { id: string }; data: RecordUpdateInput }) => Promise<RecordEntity>;
    delete: (args: { where: { id: string } }) => Promise<RecordEntity>;
  };
  recordWorkflow: {
    createMany: (args: {
      data: Array<{ recordId: string; workflowId: string }>;
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
  };
  contact: {
    create: (args: { data: ContactCreateInput }) => Promise<Contact>;
    findMany: (args?: {
      skip?: number;
      take?: number;
      where?: { workspaceId?: string };
    }) => Promise<Contact[]>;
    findUnique: (args: { where: { id: string } }) => Promise<Contact | null>;
    delete: (args: { where: { id: string } }) => Promise<Contact>;
  };
  workflow: {
    create: (args: { data: WorkflowCreateInput }) => Promise<Workflow>;
    findMany: (args?: {
      skip?: number;
      take?: number;
      where?: { workspaceId?: string };
    }) => Promise<Workflow[]>;
    findUnique: (args: { where: { id: string } }) => Promise<Workflow | null>;
    update: (args: { where: { id: string }; data: WorkflowUpdateInput }) => Promise<Workflow>;
    delete: (args: { where: { id: string } }) => Promise<Workflow>;
  };
  recordHistory: {
    findMany: (args?: {
      skip?: number;
      take?: number;
      where?: { recordId?: string };
      orderBy?: { createdAt: "asc" | "desc" };
    }) => Promise<RecordHistory[]>;
  };
  workflowRun: {
    create: (args: { data: WorkflowRunCreateInput }) => Promise<WorkflowRun>;
    findMany: (args?: {
      skip?: number;
      take?: number;
      where?: { workspaceId?: string; recordId?: string; status?: WorkflowRunStatusValue };
      orderBy?: { createdAt: "asc" | "desc" };
    }) => Promise<WorkflowRun[]>;
    findFirst: (args: {
      where: { id?: string; workspaceId?: string };
    }) => Promise<WorkflowRun | null>;
  };
}
