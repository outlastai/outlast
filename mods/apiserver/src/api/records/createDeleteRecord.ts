/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import {
  withErrorHandlingAndValidation,
  deleteRecordSchema,
  type DeleteRecordInput,
  type DbClient,
  type RecordEntity
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to delete a record by ID.
 *
 * @param client - The database client
 * @returns A validated function that deletes a record
 */
export function createDeleteRecord(client: DbClient) {
  const fn = async (params: DeleteRecordInput): Promise<RecordEntity> => {
    logger.verbose("deleting record", { id: params.id });

    const record = await client.record.delete({
      where: { id: params.id }
    });

    logger.verbose("record deleted", { id: record.id });
    return record;
  };

  return withErrorHandlingAndValidation(fn, deleteRecordSchema);
}
