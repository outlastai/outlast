/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import {
  withErrorHandlingAndValidation,
  createRecordSchema,
  type CreateRecordInput,
  type DbClient,
  type RecordEntity
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to create a new record.
 *
 * @param client - The database client
 * @param workspaceId - The workspace ID to create the record in
 * @returns A validated function that creates a record
 */
export function createCreateRecord(client: DbClient, workspaceId: string) {
  const fn = async (params: CreateRecordInput): Promise<RecordEntity> => {
    logger.verbose("creating record", { title: params.title, workspaceId });
    const record = await client.record.create({
      data: {
        ...params,
        workspaceId,
        sourceSystem: params.sourceSystem ?? "MANUAL"
      }
    });
    logger.verbose("record created", { id: record.id, title: record.title });
    return record;
  };

  return withErrorHandlingAndValidation(fn, createRecordSchema);
}
