/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * @outlast/common - Common utilities and shared code for Outlast
 */

// Errors
export { ValidationError, type FieldError } from "./errors/index.js";

// Utilities
export { assertEnvsAreSet, withErrorHandlingAndValidation } from "./utils/index.js";

// Auth
export {
  toPem,
  verifyToken,
  createAuthMiddleware,
  type TokenPayload,
  type WorkspaceAccess,
  type VerifyTokenOptions
} from "./auth/index.js";

// Schemas
export {
  // Record schemas
  createRecordSchema,
  getRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  listRecordsSchema,
  getRecordHistorySchema,
  type CreateRecordInput,
  type GetRecordInput,
  type UpdateRecordInput,
  type DeleteRecordInput,
  type ListRecordsInput,
  type GetRecordHistoryInput,
  // Record enums
  RecordType,
  RecordStatus,
  RiskLevel,
  PriorityLevel,
  SourceSystem,
  Channel,
  // Contact schemas
  createContactSchema,
  getContactSchema,
  deleteContactSchema,
  listContactsSchema,
  type CreateContactInput,
  type GetContactInput,
  type DeleteContactInput,
  type ListContactsInput,
  // Workflow schemas
  createWorkflowSchema,
  getWorkflowSchema,
  updateWorkflowSchema,
  deleteWorkflowSchema,
  listWorkflowsSchema,
  type CreateWorkflowInput,
  type GetWorkflowInput,
  type UpdateWorkflowInput,
  type DeleteWorkflowInput,
  type ListWorkflowsInput
} from "./schemas/index.js";

// Types (entities and client)
export type {
  // JSON type
  JsonObject,
  // Enum value types
  RecordTypeValue,
  RecordStatusValue,
  RiskLevelValue,
  PriorityLevelValue,
  SourceSystemValue,
  ChannelValue,
  // Record types
  RecordEntity,
  Record,
  RecordCreateInput,
  RecordUpdateInput,
  // Contact types
  Contact,
  ContactCreateInput,
  // Workflow types
  Workflow,
  WorkflowCreateInput,
  WorkflowUpdateInput,
  // RecordHistory types
  RecordHistory,
  // Database client
  DbClient
} from "./types/index.js";
