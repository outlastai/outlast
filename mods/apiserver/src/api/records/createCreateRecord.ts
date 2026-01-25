/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import {
  withErrorHandlingAndValidation,
  createRecordSchema,
  type CreateRecordInput,
  type DbClient,
  type Record
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to create a new record.
 *
 * @param client - The database client
 * @returns A validated function that creates a record
 */
export function createCreateRecord(client: DbClient) {
  const fn = async (params: CreateRecordInput): Promise<Record> => {
    logger.verbose("creating record", { title: params.title });
    const record = await client.record.create({
      data: params
    });
    logger.verbose("record created", { id: record.id, title: record.title });
    return record;
  };

  return withErrorHandlingAndValidation(fn, createRecordSchema);
}
