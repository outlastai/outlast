/**
 * Copyright (C) 2026 by Outlast.
 */
import { withErrorHandlingAndValidation } from "@outlast/common";
import { logger } from "../../logger.js";
import { createRecordHistorySchema, type CreateRecordHistoryInput } from "./schemas.js";
import type { RunnerDbClient } from "./types.js";

/**
 * Creates a function to create a record history entry.
 *
 * @param client - The database client
 * @returns A validated function that creates record history
 */
export function createCreateRecordHistory(client: RunnerDbClient) {
  const fn = async (params: CreateRecordHistoryInput): Promise<{ id: string }> => {
    logger.verbose("creating record history", {
      recordId: params.recordId,
      channel: params.channel,
      agent: params.agent
    });

    const history = await client.recordHistory.create({
      data: {
        recordId: params.recordId,
        status: params.status,
        aiNote: params.aiNote ?? null,
        humanNote: null,
        agent: params.agent,
        channel: params.channel,
        channelMetadata: params.channelMetadata ?? null
      }
    });

    logger.verbose("record history created", { historyId: history.id, recordId: params.recordId });
    return { id: history.id };
  };

  return withErrorHandlingAndValidation(fn, createRecordHistorySchema);
}
