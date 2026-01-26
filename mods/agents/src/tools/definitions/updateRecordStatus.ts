/**
 * Copyright (C) 2026 by Outlast.
 */
import type { ToolFunction } from "../types.js";

/**
 * Tool definition for updating record status.
 */
export const updateRecordStatusTool: ToolFunction = {
  type: "function",
  function: {
    name: "updateRecordStatus",
    description: "Update the status of a record (e.g., mark as DONE or BLOCKED).",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID (UUID) to update"
        },
        status: {
          type: "string",
          description: "New status for the record",
          enum: ["OPEN", "DONE", "BLOCKED", "ARCHIVED"]
        }
      },
      required: ["recordId", "status"]
    }
  }
};
