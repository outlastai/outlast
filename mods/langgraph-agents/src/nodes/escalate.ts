/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node: escalate
 * Escalates a record when automated handling fails.
 */
import { createNode } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

// Configuration
const ESCALATION_WEBHOOK_URL = process.env.ESCALATION_WEBHOOK_URL ?? "";

/**
 * Determine the reason for escalation based on state.
 */
function determineEscalationReason(callStatus: string | null, errors: string[]): string {
  if (errors.length > 0) {
    return `Workflow errors: ${errors.slice(0, 3).join("; ")}`;
  }

  if (callStatus === "failed") {
    return "Phone call failed";
  }

  if (callStatus === "noAnswer") {
    return "Customer did not answer phone";
  }

  return "Automated handling not possible";
}

/**
 * Notify escalation via webhook (if configured).
 */
async function notifyEscalation(
  recordId: string,
  reason: string,
  callStatus: string | null,
  data: Record<string, unknown>
): Promise<void> {
  if (!ESCALATION_WEBHOOK_URL) return;

  const payload = {
    recordId,
    reason,
    callStatus,
    phoneNumber: data.phoneNumber,
    contactEmail: data.contactEmail
  };

  await fetch(ESCALATION_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

/**
 * Escalate the record for human review.
 */
export const escalate = createNode(
  "escalate",
  async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    const recordId = state.recordId;
    const callStatus = state.callStatus;
    const data = state.data ?? {};
    const errors = state.errors ?? [];

    // Determine escalation reason
    const reason = determineEscalationReason(callStatus, errors);

    // Log escalation
    const messages = [`Record ${recordId} escalated: ${reason}`];

    // Optionally notify via webhook
    if (ESCALATION_WEBHOOK_URL) {
      try {
        await notifyEscalation(recordId, reason, callStatus, data);
        messages.push("Escalation notification sent");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        messages.push(`Failed to send escalation notification: ${msg}`);
      }
    }

    return {
      escalated: true,
      escalationReason: reason,
      recordStatus: "BLOCKED",
      recordNote: `Escalated: ${reason}`,
      messages
    };
  }
);
