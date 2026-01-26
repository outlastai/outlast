/**
 * Copyright (C) 2026 by Outlast.
 *
 * Query records for a workflow.
 */
import type { RecordStatus } from "../staticCheck/types.js";
import type { RecordWithHistory } from "./types.js";
import { logger } from "../logger.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prisma client type (minimal interface).
 * Uses permissive types to allow Prisma client duck-typing.
 */
interface PrismaLike {
  record: {
    findMany: (args: any) => Promise<any[]>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * List records associated with a workflow that need processing.
 * Filters by enabled statuses and includes contact + history.
 */
export async function listRecordsForWorkflow(
  prisma: PrismaLike,
  workflowId: string,
  enabledStatuses: RecordStatus[],
  batchSize: number
): Promise<RecordWithHistory[]> {
  logger.verbose("listing records for workflow", {
    workflowId,
    enabledStatuses,
    batchSize
  });

  const records = await prisma.record.findMany({
    where: {
      status: { in: enabledStatuses },
      recordWorkflows: {
        some: { workflowId }
      }
    },
    include: {
      contact: true,
      history: {
        orderBy: { createdAt: "desc" },
        take: 50
      }
    },
    take: batchSize,
    orderBy: { updatedAt: "asc" }
  });

  logger.verbose("records found for workflow", {
    workflowId,
    count: records.length,
    recordIds: records.map((r: { id: string }) => r.id)
  });

  return records as unknown as RecordWithHistory[];
}
