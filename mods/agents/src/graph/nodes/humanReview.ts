/**
 * Copyright (C) 2026 by Outlast.
 *
 * Human review node: interrupts for human approval/decision.
 */
import { interrupt } from "@langchain/langgraph";
import type { GraphNodeFn } from "../types.js";
import type { ProcurementState, ProcurementMessage } from "../state.js";

/**
 * Resume value when continuing from humanReview interrupt.
 */
export interface HumanReviewResume {
  approved: boolean;
  notes: string;
  nextAction: "continue" | "escalate" | "close";
}

export function createHumanReviewNode(): GraphNodeFn {
  return (state: ProcurementState): Partial<ProcurementState> => {
    const decision = interrupt({
      reason: "human_approval_required",
      recordId: state.record.id,
      context: {
        attempts: state.attempts,
        lastMessages: state.messages.slice(-5).map((m) => ({ role: m.role, content: m.content }))
      }
    }) as HumanReviewResume;

    const message: ProcurementMessage = {
      role: "user",
      content: `Human review: ${decision.notes} (${decision.nextAction})`,
      metadata: decision as unknown as Record<string, unknown>
    };

    const workflowStatus = decision.nextAction === "close" ? "COMPLETED" : "RUNNING";

    return {
      currentNode: "humanReview",
      workflowStatus,
      messages: [message],
      nextNode: "analyzeRecord"
    };
  };
}
