/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  listRecordsSchema,
  type ListRecordsInput,
  type DbClient,
  type RecordEntity
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to list records with optional pagination and filtering.
 *
 * @param client - The database client
 * @returns A validated function that lists records
 */
export function createListRecords(client: DbClient) {
  const fn = async (params: ListRecordsInput): Promise<RecordEntity[]> => {
    logger.verbose("listing records", { skip: params.skip, take: params.take });

    const records = await client.record.findMany({
      skip: params.skip,
      take: params.take,
      where: {
        status: params.status,
        type: params.type
      }
    });

    logger.verbose("records listed", { count: records.length });
    return records;
  };

  return withErrorHandlingAndValidation(fn, listRecordsSchema);
}
