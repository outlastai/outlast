/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  getRecordHistorySchema,
  type GetRecordHistoryInput,
  type DbClient,
  type RecordHistory
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to get history for a specific record.
 *
 * @param client - The database client
 * @returns A validated function that retrieves record history
 */
export function createGetRecordHistory(client: DbClient) {
  const fn = async (params: GetRecordHistoryInput): Promise<RecordHistory[]> => {
    logger.verbose("getting record history", { recordId: params.recordId });

    const history = await client.recordHistory.findMany({
      where: { recordId: params.recordId },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" }
    });

    logger.verbose("record history retrieved", { count: history.length });
    return history;
  };

  return withErrorHandlingAndValidation(fn, getRecordHistorySchema);
}
