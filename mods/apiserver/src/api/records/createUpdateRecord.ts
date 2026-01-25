/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import {
  withErrorHandlingAndValidation,
  updateRecordSchema,
  type UpdateRecordInput,
  type DbClient,
  type RecordEntity
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to update an existing record.
 *
 * @param client - The database client
 * @returns A validated function that updates a record
 */
export function createUpdateRecord(client: DbClient) {
  const fn = async (params: UpdateRecordInput): Promise<RecordEntity> => {
    logger.verbose("updating record", { id: params.id });

    const { id, ...data } = params;

    const record = await client.record.update({
      where: { id },
      data
    });

    logger.verbose("record updated", { id: record.id, title: record.title });
    return record;
  };

  return withErrorHandlingAndValidation(fn, updateRecordSchema);
}
