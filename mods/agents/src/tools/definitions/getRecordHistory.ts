/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ToolFunction } from "../types.js";

/**
 * Tool definition for retrieving record history.
 */
export const getRecordHistoryTool: ToolFunction = {
  type: "function",
  function: {
    name: "getRecordHistory",
    description: "Retrieve the action history for a record.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID (UUID) to get history for"
        },
        limit: {
          type: "number",
          description: "Maximum number of history entries to return (default: 20)"
        }
      },
      required: ["recordId"]
    }
  }
};
