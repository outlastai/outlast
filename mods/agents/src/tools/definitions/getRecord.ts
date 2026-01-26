/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ToolFunction } from "../types.js";

/**
 * Tool definition for retrieving record details.
 */
export const getRecordTool: ToolFunction = {
  type: "function",
  function: {
    name: "getRecord",
    description: "Retrieve full details of a record including contact information.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID (UUID) to retrieve"
        }
      },
      required: ["recordId"]
    }
  }
};
