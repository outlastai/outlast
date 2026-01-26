/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { ToolFunction } from "../types.js";

/**
 * Tool definition for initiating a phone call.
 */
export const sendCallTool: ToolFunction = {
  type: "function",
  function: {
    name: "sendCall",
    description:
      "Initiate a phone call to the contact associated with this record. " +
      "Creates a RecordHistory entry with channel PHONE.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID (UUID) to call about"
        },
        talkingPoints: {
          type: "string",
          description: "Key points to discuss during the call"
        }
      },
      required: ["recordId", "talkingPoints"]
    }
  }
};
