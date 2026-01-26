/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { withErrorHandlingAndValidation } from "@outlast/common";
import type { RecordStatus } from "@outlast/agents";
import { logger } from "../../logger.js";
import { getRecordWithContactSchema, type GetRecordWithContactInput } from "./schemas.js";
import type { RunnerDbClient, RecordWithHistory } from "./types.js";

/**
 * Transform Prisma record into domain type.
 */
function toRecordWithHistory(prismaRecord: {
  id: string;
  status: string;
  priority: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    preferredChannel: string;
  } | null;
  history: Array<{
    id: string;
    channel: string;
    createdAt: Date;
    aiNote: string | null;
  }>;
}): RecordWithHistory {
  return {
    id: prismaRecord.id,
    status: prismaRecord.status as RecordStatus,
    priority: prismaRecord.priority,
    createdAt: prismaRecord.createdAt,
    updatedAt: prismaRecord.updatedAt,
    contact: prismaRecord.contact,
    history: prismaRecord.history
  };
}

/**
 * Creates a function to get a record with its contact and history.
 *
 * @param client - The database client
 * @returns A validated function that retrieves a record with contact
 */
export function createGetRecordWithContact(client: RunnerDbClient) {
  const fn = async (params: GetRecordWithContactInput): Promise<RecordWithHistory | null> => {
    logger.verbose("getting record with contact", { recordId: params.id });

    const record = await client.record.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        history: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (record) {
      logger.verbose("record retrieved", { recordId: record.id });
      return toRecordWithHistory(record);
    } else {
      logger.verbose("record not found", { recordId: params.id });
      return null;
    }
  };

  return withErrorHandlingAndValidation(fn, getRecordWithContactSchema);
}
