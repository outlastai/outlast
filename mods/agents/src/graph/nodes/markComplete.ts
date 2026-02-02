/**
 * Copyright (C) 2026 by Outlast.
 *
 * Mark complete node: calls updateRecordStatus(DONE) and ends workflow.
 */
import type { GraphNodeFn, GraphDependencies } from "../types.js";
import type { ProcurementState, ProcurementMessage } from "../state.js";

export function createMarkCompleteNode(
  toolExecutor: GraphDependencies["toolExecutor"]
): GraphNodeFn {
  return async (state: ProcurementState): Promise<Partial<ProcurementState>> => {
    await toolExecutor("updateRecordStatus", {
      recordId: state.record.id,
      status: "DONE"
    });

    const message: ProcurementMessage = {
      role: "tool",
      content: "Record marked as DONE.",
      metadata: { node: "markComplete" }
    };

    return {
      currentNode: "markComplete",
      workflowStatus: "COMPLETED",
      // Update the record status in state to reflect the tool call
      record: { ...state.record, status: "DONE" },
      messages: [message],
      nextNode: "__end__"
    };
  };
}
