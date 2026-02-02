/**
 * Copyright (C) 2026 by Outlast.
 *
 * Analyze record node: LLM decides next action (send email, send call, escalate, or complete).
 */
import type { GraphNodeFn, GraphDependencies } from "../types.js";
import type { ProcurementState } from "../state.js";
import { buildRecordSummary } from "./buildRecordSummary.js";

export function createAnalyzeRecordNode(invokeLLM: GraphDependencies["invokeLLM"]): GraphNodeFn {
  return async (state: ProcurementState): Promise<Partial<ProcurementState>> => {
    const summary = buildRecordSummary(state);
    // Convert tool messages to user messages for LLM history
    // OpenAI requires tool messages to follow assistant messages with tool_calls,
    // but these are internal workflow action logs, not LLM tool call responses
    const history = state.messages.map((m) => ({
      role: m.role === "tool" ? ("user" as const) : m.role,
      content: m.role === "tool" ? `[System Action] ${m.content}` : m.content
    }));
    const response = await invokeLLM(history, summary, {
      recordId: state.record.id,
      attempts: state.attempts
    });

    const decision = (response?.toLowerCase?.() ?? "").trim();
    let nextNode: string;
    if (decision.includes("needs_email") || decision.includes("send email")) {
      nextNode = "sendEmail";
    } else if (decision.includes("needs_call") || decision.includes("send call")) {
      nextNode = "sendCall";
    } else if (decision.includes("escalate")) {
      nextNode = "humanReview";
    } else {
      nextNode = "markComplete";
    }

    return {
      currentNode: "analyzeRecord",
      nextNode,
      messages: [
        {
          role: "assistant" as const,
          content: response,
          metadata: { decision: nextNode }
        }
      ]
    };
  };
}
