/**
 * Copyright (C) 2026 by Outlast.
 */
import type { ToolFunction } from "../types.js";

/**
 * Tool definition for sending a follow-up email.
 */
export const sendEmailTool: ToolFunction = {
  type: "function",
  function: {
    name: "sendEmail",
    description:
      "Send a follow-up email to the contact associated with this record. " +
      "Creates a RecordHistory entry with channel EMAIL.",
    parameters: {
      type: "object",
      properties: {
        recordId: {
          type: "string",
          description: "The record ID (UUID) to send follow-up for"
        },
        subject: {
          type: "string",
          description: "Email subject line"
        },
        body: {
          type: "string",
          description: "Email body content"
        }
      },
      required: ["recordId", "subject", "body"]
    }
  }
};
