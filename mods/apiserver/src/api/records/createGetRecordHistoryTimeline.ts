/**
 * Copyright (C) 2026 by Outlast.
 *
 * Get full checkpoint timeline for a record (debugging/audit).
 */
import {
  withErrorHandlingAndValidation,
  getRecordHistoryTimelineSchema,
  type GetRecordHistoryTimelineInput,
  type RecordHistoryTimelineEntry
} from "@outlast/common";
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { logger } from "../../logger.js";

/**
 * Creates a function to get the checkpoint timeline for a record.
 *
 * @param checkpointer - LangGraph checkpointer
 * @returns A validated function that returns timeline entries
 */
export function createGetRecordHistoryTimeline(checkpointer: BaseCheckpointSaver) {
  const fn = async (
    params: GetRecordHistoryTimelineInput
  ): Promise<RecordHistoryTimelineEntry[]> => {
    logger.verbose("getting record history timeline", { recordId: params.recordId });

    const timeline: RecordHistoryTimelineEntry[] = [];
    for await (const tuple of checkpointer.list({
      configurable: { thread_id: params.recordId }
    })) {
      const meta = tuple.metadata as { step?: number; source?: string } | undefined;
      timeline.push({
        id: tuple.checkpoint.id,
        timestamp: tuple.checkpoint.ts,
        step: meta?.step,
        nodeExecuted: meta?.source
      });
    }

    logger.verbose("record history timeline retrieved", { count: timeline.length });
    return timeline;
  };

  return withErrorHandlingAndValidation(fn, getRecordHistoryTimelineSchema);
}
