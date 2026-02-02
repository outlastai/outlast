/**
 * Copyright (C) 2026 by Outlast.
 *
 * Wait for response node: interrupts until resume (external response or mock).
 */
import { interrupt } from "@langchain/langgraph";
import type { GraphNodeFn } from "../types.js";
import type { ProcurementState, ProcurementMessage } from "../state.js";

/**
 * Resume value type when continuing from waitForResponse interrupt.
 */
export interface WaitForResponseResume {
  channel: string;
  content: string;
  channelMessageId?: string;
  timeout?: boolean;
  metadata?: Record<string, unknown>;
}

export function createWaitForResponseNode(): GraphNodeFn {
  return (state: ProcurementState): Partial<ProcurementState> => {
    // When no resume: interrupt() throws and graph pauses.
    // When resumed via Command({ resume }): interrupt() returns the resume value.
    const resume = interrupt({
      reason: "waiting_for_external_response",
      recordId: state.record.id,
      channel: state.lastChannel ?? "EMAIL"
    }) as WaitForResponseResume;

    const message: ProcurementMessage = {
      role: "user",
      content: resume.content,
      channel: resume.channel,
      channelMessageId: resume.channelMessageId,
      metadata: resume.metadata
    };

    return {
      currentNode: "waitForResponse",
      waitingForResponse: false,
      messages: [message],
      nextNode: "processResponse"
    };
  };
}
