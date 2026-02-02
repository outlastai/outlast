/**
 * Copyright (C) 2026 by Outlast.
 *
 * Send email node: calls sendEmail tool and routes to waitForResponse.
 */
import type { GraphNodeFn, GraphDependencies } from "../types.js";
import type { ProcurementState, ProcurementMessage } from "../state.js";

export function createSendEmailNode(toolExecutor: GraphDependencies["toolExecutor"]): GraphNodeFn {
  return async (state: ProcurementState): Promise<Partial<ProcurementState>> => {
    const contact = state.contact;
    const email = contact?.email ?? "";
    const result = await toolExecutor("sendEmail", {
      to: email,
      subject: `Follow-up: ${state.record.title}`,
      body: `Regarding record ${state.record.title}. Status: ${state.record.status}.`
    });

    const note: ProcurementMessage = {
      role: "tool",
      content: result.success ? `Email sent to ${email}` : (result.message ?? "Send failed"),
      channel: "EMAIL",
      metadata: result as unknown as Record<string, unknown>
    };

    return {
      currentNode: "sendEmail",
      attempts: state.attempts + 1,
      lastChannel: "EMAIL",
      waitingForResponse: true,
      messages: [note],
      nextNode: "waitForResponse"
    };
  };
}
