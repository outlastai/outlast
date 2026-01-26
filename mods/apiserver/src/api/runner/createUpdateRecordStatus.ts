/**
 * Copyright (C) 2026 by Outlast.
 */
import { withErrorHandlingAndValidation } from "@outlast/common";
import { logger } from "../../logger.js";
import { updateRecordStatusSchema, type UpdateRecordStatusInput } from "./schemas.js";
import type { RunnerDbClient } from "./types.js";

/**
 * Creates a function to update a record's status.
 *
 * @param client - The database client
 * @returns A validated function that updates record status
 */
export function createUpdateRecordStatus(client: RunnerDbClient) {
  const fn = async (params: UpdateRecordStatusInput): Promise<{ id: string }> => {
    logger.verbose("updating record status", { recordId: params.id, status: params.status });

    const record = await client.record.update({
      where: { id: params.id },
      data: { status: params.status }
    });

    logger.verbose("record status updated", { recordId: record.id, status: params.status });
    return { id: record.id };
  };

  return withErrorHandlingAndValidation(fn, updateRecordStatusSchema);
}
