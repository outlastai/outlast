/**
 * Copyright (C) 2026 by Outlast.
 *
 * Process response node: LLM analyzes the incoming response and updates state.
 */
import type { GraphNodeFn, GraphDependencies } from "../types.js";
import type { ProcurementState, ProcurementMessage } from "../state.js";

export function createProcessResponseNode(invokeLLM: GraphDependencies["invokeLLM"]): GraphNodeFn {
  return async (state: ProcurementState): Promise<Partial<ProcurementState>> => {
    const lastUser = state.messages.filter((m) => m.role === "user").pop();
    const context = lastUser
      ? `Incoming response (${lastUser.channel ?? "unknown"}): ${lastUser.content}`
      : "No new response.";
    // Convert tool messages to user messages for LLM history
    // OpenAI requires tool messages to follow assistant messages with tool_calls,
    // but these are internal workflow action logs, not LLM tool call responses
    const history = state.messages.map((m) => ({
      role: m.role === "tool" ? ("user" as const) : m.role,
      content: m.role === "tool" ? `[System Action] ${m.content}` : m.content
    }));
    const response = await invokeLLM(history, context, {
      recordId: state.record.id,
      task: "process_response"
    });

    const message: ProcurementMessage = {
      role: "assistant",
      content: response,
      metadata: { node: "processResponse" }
    };

    return {
      currentNode: "processResponse",
      messages: [message],
      nextNode: "analyzeRecord"
    };
  };
}
