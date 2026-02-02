/**
 * Copyright (C) 2026 by Outlast.
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
  getRecordHistoryResponseSchema,
  getRecordHistoryTimelineSchema,
  recordHistoryTimelineEntrySchema,
  resumeWorkflowSchema,
  submitHumanReviewSchema,
  listPendingReviewsSchema,
  recordFileSchema,
  type CreateRecordInput,
  type GetRecordInput,
  type UpdateRecordInput,
  type DeleteRecordInput,
  type ListRecordsInput,
  type GetRecordHistoryInput,
  type GetRecordHistoryResponse,
  type GetRecordHistoryTimelineInput,
  type RecordHistoryTimelineEntry,
  type ResumeWorkflowInput,
  type SubmitHumanReviewInput,
  type ListPendingReviewsInput,
  type RecordFileInput,
  // Record enums
  RecordType,
  RecordStatus,
  RiskLevel,
  PriorityLevel,
  SourceSystem,
  Channel,
  RECORD_TYPE_CHOICES,
  RECORD_STATUS_CHOICES,
  PRIORITY_CHOICES,
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
  type ListWorkflowsInput,
  // Workflow file schemas
  workflowFileSchema,
  workflowUpdateFileSchema,
  schedulerRulesFileSchema,
  type WorkflowFileInput,
  type WorkflowUpdateFileInput,
  type SchedulerRulesFileInput,
  // LangGraph workflow / evals
  workflowLangGraphFileSchema,
  evalsSectionSchema,
  evalsContextSchema,
  evalScenarioSchema,
  graphNodeSchema,
  graphNodesSchema,
  nodeConditionSchema,
  workflowSchedulerSchema,
  type WorkflowLangGraphFile,
  type EvalsSection,
  type EvalsContext,
  type EvalScenario,
  type EvalInitialState,
  type EvalExpected,
  type EvalInterruptResume,
  type ExpectedToolCall,
  type ExpectedLlmResponse,
  type GraphNode,
  type GraphNodes,
  type NodeCondition,
  type WorkflowScheduler
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
  // Database client
  DbClient
} from "./types/index.js";
