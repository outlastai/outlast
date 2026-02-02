/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node: finishRecord
 * Final node that updates the record status and creates history entries.
 */
import { createNode } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

// Configuration
const OUTLAST_API_URL = process.env.OUTLAST_API_URL ?? "http://localhost:3000";
const OUTLAST_ACCESS_KEY = process.env.OUTLAST_ACCESS_KEY ?? "";

/**
 * Determine the final record status based on workflow outcome.
 */
function determineFinalStatus(state: WorkflowStateType): string {
  // If escalated, keep as BLOCKED
  if (state.escalated) {
    return "BLOCKED";
  }

  // If email was sent successfully, mark as DONE
  if (state.emailSent) {
    return "DONE";
  }

  // If call completed, mark as DONE
  if (state.callStatus === "completed") {
    return "DONE";
  }

  // Otherwise keep as OPEN for retry
  return "OPEN";
}

/**
 * Build a summary note for the record history.
 */
function buildSummaryNote(state: WorkflowStateType): string {
  const parts: string[] = [];

  // Call outcome
  if (state.callStatus) {
    parts.push(`Call: ${state.callStatus}`);
  }

  // Email outcome
  if (state.emailSent) {
    parts.push("Email sent");
  }

  // Escalation
  if (state.escalated) {
    const reason = state.escalationReason ?? "unknown reason";
    parts.push(`Escalated: ${reason}`);
  }

  // Errors
  const errors = state.errors ?? [];
  if (errors.length > 0) {
    parts.push(`Errors: ${errors.length}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "Workflow completed";
}

/**
 * Update record status via Outlast API.
 */
async function updateRecordStatus(recordId: string, status: string, note: string): Promise<void> {
  if (!OUTLAST_ACCESS_KEY) return;

  const headers = {
    "Content-Type": "application/json",
    "x-access-key-id": OUTLAST_ACCESS_KEY
  };

  // Update record status
  await fetch(`${OUTLAST_API_URL}/trpc/updateRecord`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: recordId, status })
  });

  // Create history entry (optional, don't fail if it doesn't work)
  try {
    await fetch(`${OUTLAST_API_URL}/trpc/createRecordHistory`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        recordId,
        status,
        aiNote: note,
        agent: "langgraph-workflow",
        channel: "PHONE"
      })
    });
  } catch {
    // Ignore history creation errors
  }
}

/**
 * Finalize the record processing.
 */
export const finishRecord = createNode(
  "finishRecord",
  async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    const recordId = state.recordId;

    if (!recordId) {
      return {
        errors: ["No record ID in state, cannot finish record"]
      };
    }

    // Determine final status based on workflow outcome
    const finalStatus = determineFinalStatus(state);

    // Build summary note
    const summaryNote = buildSummaryNote(state);

    const messages = [`Workflow completed for record ${recordId}`];

    // Update record via Outlast API (if configured)
    if (OUTLAST_API_URL && OUTLAST_ACCESS_KEY) {
      try {
        await updateRecordStatus(recordId, finalStatus, summaryNote);
        messages.push(`Record status updated to ${finalStatus}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        messages.push(`Failed to update record: ${msg}`);
      }
    }

    return {
      recordStatus: finalStatus,
      recordNote: summaryNote,
      messages
    };
  }
);
