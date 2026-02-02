/**
 * Copyright (C) 2026 by Outlast.
 */

/**
 * Generic JSON object type for metadata fields.
 */
export type JsonObject = { [key: string]: unknown };

// =============================================================================
// Client Config
// =============================================================================

export type ClientConfig = {
  endpoint?: string;
  workspaceAccessKeyId?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  accessKeyId?: string;
};

// =============================================================================
// Workspace Types
// =============================================================================

export type Workspace = {
  ref: string;
  name: string;
  accessKeyId: string;
  ownerRef?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ListWorkspacesResponse = {
  items: Workspace[];
  nextPageToken?: string;
};

export type CreateWorkspaceRequest = {
  name: string;
};

export type UpdateWorkspaceRequest = {
  ref: string;
  name: string;
};

export type DeleteWorkspaceResponse = {
  ref: string;
};

// =============================================================================
// API Key Types
// =============================================================================

export type CreateApiKeyRequest = {
  role: "WORKSPACE_OWNER" | "WORKSPACE_ADMIN" | "WORKSPACE_MEMBER";
  expiresAt?: number;
};

export type CreateApiKeyResponse = {
  ref: string;
  accessKeyId: string;
  accessKeySecret: string;
};

export type ApiKey = {
  ref: string;
  accessKeyId: string;
  role: string;
  expiresAt?: string | Date | number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ListApiKeysRequest = {
  pageSize?: number;
  pageToken?: string;
};

export type ListApiKeysResponse = {
  items: ApiKey[];
  nextPageToken?: string;
};

export type RegenerateApiKeyResponse = {
  ref: string;
  accessKeyId: string;
  accessKeySecret: string;
};

// =============================================================================
// Record Types
// =============================================================================

export type RecordType =
  | "GENERIC"
  | "PURCHASE_ORDER"
  | "INVENTORY_ITEM"
  | "INVOICE"
  | "SHIPMENT"
  | "TICKET"
  | "RETURN";

export type RecordStatus = "OPEN" | "DONE" | "BLOCKED" | "ARCHIVED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH";

export type SourceSystem = "CSV" | "ODOO" | "SALESFORCE" | "SAP" | "EMAIL" | "MANUAL";

export type Channel = "EMAIL" | "PHONE" | "SMS" | "WHATSAPP";

export type RecordEntity = {
  id: string;
  workspaceId: string;
  type: RecordType;
  title: string;
  status: RecordStatus;
  risk: RiskLevel | null;
  priority: PriorityLevel | null;
  contactId: string | null;
  dueAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  sourceSystem: SourceSystem;
  sourceRecordId: string | null;
  metadata: JsonObject | null;
  rawData: JsonObject | null;
};

/**
 * @deprecated Use RecordEntity instead.
 */
export type Record = RecordEntity;

export type CreateRecordRequest = {
  // Required fields
  title: string;
  type: RecordType;
  sourceSystem: SourceSystem;
  sourceRecordId: string;
  // Fields with defaults (optional in request)
  status?: RecordStatus;
  priority?: PriorityLevel;
  // Optional fields
  risk?: RiskLevel;
  contactId?: string | null;
  dueAt?: string | Date | null;
  metadata?: JsonObject | null;
  rawData?: JsonObject | null;
  // Workflow associations
  workflowIds?: string[];
  // Upsert options
  allowOverwrite?: boolean;
  overwriteFields?: string[];
};

/**
 * Request to update a record. Only these fields are updatable;
 * type and sourceSystem/sourceRecordId are set at creation only.
 */
export type UpdateRecordRequest = {
  id: string;
  title?: string;
  status?: RecordStatus;
  risk?: RiskLevel | null;
  priority?: PriorityLevel | null;
  contactId?: string | null;
  dueAt?: string | Date | null;
  metadata?: JsonObject | null;
};

export type DeleteRecordRequest = {
  id: string;
};

export type ListRecordsRequest = {
  skip?: number;
  take?: number;
  status?: RecordStatus;
  type?: RecordType;
};

export type GetRecordHistoryRequest = {
  recordId: string;
  skip?: number;
  take?: number;
};

/** Conversation message (LangGraph / getRecordHistory response). */
export type RecordConversationMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  channel?: string;
  channelMessageId?: string;
  metadata?: { [key: string]: unknown };
};

/** getRecordHistory response (from LangGraph checkpoints). */
export type GetRecordHistoryResponse = {
  messages: RecordConversationMessage[];
  attempts: number;
  lastChannel: string | null;
  workflowStatus?: string | null;
  updatedAt?: string | null;
};

/** Request for listPendingReviews (workspaceId optional when from context). */
export type ListPendingReviewsRequest = {
  workspaceId?: string;
};

/** Request for submitHumanReview. */
export type SubmitHumanReviewRequest = {
  recordId: string;
  workflowId?: string;
  decision: {
    approved: boolean;
    notes: string;
    nextAction: "continue" | "escalate" | "close";
  };
};

// =============================================================================
// Contact Types
// =============================================================================

export type Contact = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredChannel: Channel;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type CreateContactRequest = {
  name: string;
  email?: string | null;
  phone?: string | null;
  preferredChannel: Channel;
};

export type DeleteContactRequest = {
  id: string;
};

export type ListContactsRequest = {
  skip?: number;
  take?: number;
};

// =============================================================================
// Workflow Types
// =============================================================================

export type GraphDefinition = {
  entrypoint: string;
  nodes: { [key: string]: unknown };
};

export type Workflow = {
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
  graphDefinition: GraphDefinition | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type CreateWorkflowRequest = {
  name: string;
  description?: string | null;
  model?: string | null;
  systemPrompt?: string | null;
  temperature?: number | null;
  tools?: unknown[] | null;
  schedule?: string | null;
  emailTemplate?: string | null;
  callPrompt?: string | null;
  graphDefinition?: GraphDefinition | null;
};

export type UpdateWorkflowRequest = {
  id: string;
  name?: string;
  description?: string | null;
  model?: string | null;
  systemPrompt?: string | null;
  temperature?: number | null;
  tools?: unknown[] | null;
  schedule?: string | null;
  emailTemplate?: string | null;
  callPrompt?: string | null;
  graphDefinition?: GraphDefinition | null;
};

export type DeleteWorkflowRequest = {
  id: string;
};

export type ListWorkflowsRequest = {
  skip?: number;
  take?: number;
};
