/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node: waitFonoster
 * Runs AFTER the workflow is resumed by the Fonoster webhook.
 * Validates that the call data was properly received.
 */
import { createNode } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

/**
 * Normalize various call status strings to standard values.
 */
function normalizeCallStatus(status: string | null): string {
  if (!status) return "failed";

  const statusLower = status.toLowerCase();

  if (["completed", "complete", "answered", "success"].includes(statusLower)) {
    return "completed";
  }
  if (["noanswer", "no_answer", "no-answer", "unanswered", "busy"].includes(statusLower)) {
    return "noAnswer";
  }
  if (["failed", "error", "cancelled", "canceled"].includes(statusLower)) {
    return "failed";
  }
  if (["pending", "ringing", "in_progress", "in-progress"].includes(statusLower)) {
    return "pending";
  }

  return status;
}

/**
 * Process and validate Fonoster call completion data.
 */
export const waitFonoster = createNode(
  "waitFonoster",
  (state: WorkflowStateType): Partial<WorkflowStateType> => {
    const callStatus = state.callStatus;
    const chatHistory = state.chatHistory ?? [];
    const recordingUrl = state.recordingUrl;

    // Validate that we have the expected data
    if (!callStatus) {
      return {
        errors: ["No call status received from Fonoster"],
        callStatus: "failed"
      };
    }

    // Normalize call status
    const normalizedStatus = normalizeCallStatus(callStatus);

    // Build messages based on call outcome
    const messages: string[] = [];

    if (normalizedStatus === "completed") {
      const turnCount = chatHistory.length;
      messages.push(`Call completed successfully with ${turnCount} conversation turns`);
      if (recordingUrl) {
        messages.push(`Recording available at: ${recordingUrl}`);
      }
    } else if (normalizedStatus === "noAnswer") {
      messages.push("Call was not answered");
    } else if (normalizedStatus === "failed") {
      messages.push("Call failed");
    }

    return {
      callStatus: normalizedStatus,
      messages
    };
  }
);
