/**
 * Copyright (C) 2026 by Outlast.
 *
 * Send call node: calls sendCall tool and routes to waitForResponse.
 */
import type { GraphNodeFn, GraphDependencies } from "../types.js";
import type { ProcurementState, ProcurementMessage } from "../state.js";

export function createSendCallNode(toolExecutor: GraphDependencies["toolExecutor"]): GraphNodeFn {
  return async (state: ProcurementState): Promise<Partial<ProcurementState>> => {
    const contact = state.contact;
    const phone = contact?.phone ?? "";
    const result = await toolExecutor("sendCall", {
      phone,
      talkingPoints: `Follow-up on ${state.record.title}. Status: ${state.record.status}.`
    });

    const note: ProcurementMessage = {
      role: "tool",
      content: result.success ? `Call initiated to ${phone}` : (result.message ?? "Call failed"),
      channel: "PHONE",
      metadata: result as unknown as Record<string, unknown>
    };

    return {
      currentNode: "sendCall",
      attempts: state.attempts + 1,
      lastChannel: "PHONE",
      waitingForResponse: true,
      messages: [note],
      nextNode: "waitForResponse"
    };
  };
}
