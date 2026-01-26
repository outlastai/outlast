/**
 * Copyright (C) 2026 by Outlast.
 */
import { withErrorHandlingAndValidation } from "@outlast/common";
import { logger } from "../../logger.js";
import { getRecordHistorySchema, type GetRecordHistoryInput } from "./schemas.js";
import type { RunnerDbClient, RecordHistoryEntry } from "./types.js";

/**
 * Transform Prisma record history into domain type.
 */
function toRecordHistoryEntry(prismaHistory: {
  id: string;
  channel: string;
  createdAt: Date;
  aiNote: string | null;
}): RecordHistoryEntry {
  return {
    id: prismaHistory.id,
    channel: prismaHistory.channel,
    createdAt: prismaHistory.createdAt,
    aiNote: prismaHistory.aiNote
  };
}

/**
 * Creates a function to get history entries for a record.
 *
 * @param client - The database client
 * @returns A validated function that retrieves record history
 */
export function createGetRecordHistory(client: RunnerDbClient) {
  const fn = async (params: GetRecordHistoryInput): Promise<RecordHistoryEntry[]> => {
    logger.verbose("getting record history", { recordId: params.recordId, limit: params.limit });

    const history = await client.recordHistory.findMany({
      where: { recordId: params.recordId },
      orderBy: { createdAt: "desc" },
      take: params.limit ?? 50
    });

    logger.verbose("record history retrieved", {
      recordId: params.recordId,
      count: history.length
    });
    return history.map(toRecordHistoryEntry);
  };

  return withErrorHandlingAndValidation(fn, getRecordHistorySchema);
}
