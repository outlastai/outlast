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
  createRecordSchema,
  getRecordSchema,
  listRecordsSchema,
  type CreateRecordInput,
  type GetRecordInput,
  type ListRecordsInput
} from "./schemas/index.js";

// Types (entities and client)
export type { DbClient, Record, RecordCreateInput } from "./types/index.js";
