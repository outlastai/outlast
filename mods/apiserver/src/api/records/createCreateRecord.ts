/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  createRecordSchema,
  type CreateRecordInput,
  type DbClient,
  type RecordEntity
} from "@outlast/common";
import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.js";

const RECORD_TOP_LEVEL_FIELDS = new Set([
  "title",
  "type",
  "status",
  "risk",
  "priority",
  "contactId",
  "dueAt",
  "sourceSystem",
  "sourceRecordId",
  "metadata",
  "rawData"
]);

function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in current) || typeof (current as Record<string, unknown>)[key] !== "object") {
      (current as Record<string, unknown>)[key] = {};
    }
    current = (current as Record<string, unknown>)[key] as Record<string, unknown>;
  }
  (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
}

/**
 * Build update data from input using only the allowed overwrite fields.
 * Ignores fields that don't exist on the Record model or in the input.
 */
function pickOverwriteFields(
  input: CreateRecordInput,
  overwriteFields: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const inputObj = input as Record<string, unknown>;

  for (const field of overwriteFields) {
    const value = getAtPath(inputObj, field);
    if (value === undefined) continue;

    const topLevel = field.split(".")[0];
    if (!RECORD_TOP_LEVEL_FIELDS.has(topLevel)) continue;

    setAtPath(result, field, value);
  }

  return result;
}

/**
 * Converts a plain object with nested paths into Prisma-style update data.
 * Merges nested objects (e.g. metadata) with existing record values.
 */
function toPrismaUpdate(
  picked: Record<string, unknown>,
  existingRecord: RecordEntity
): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  const nestedByTop: Record<string, Record<string, unknown>> = {};

  for (const key of Object.keys(picked)) {
    if (key.includes(".")) {
      const [top, ...rest] = key.split(".");
      const innerKey = rest.join(".");
      if (!nestedByTop[top]) {
        const existingTop = (existingRecord as unknown as Record<string, unknown>)[top];
        nestedByTop[top] =
          existingTop && typeof existingTop === "object" && !Array.isArray(existingTop)
            ? { ...(existingTop as Record<string, unknown>) }
            : {};
      }
      const value = getAtPath(picked, key);
      setAtPath(nestedByTop[top], innerKey, value);
    } else {
      update[key] = picked[key];
    }
  }

  for (const [top, obj] of Object.entries(nestedByTop)) {
    update[top] = obj;
  }

  return update;
}

/**
 * Creates a function to create a new record (or update existing when allowOverwrite is set).
 *
 * @param client - The database client
 * @param workspaceId - The workspace ID to create the record in
 * @returns A validated function that creates or updates a record
 */
export function createCreateRecord(client: DbClient, workspaceId: string) {
  const fn = async (params: CreateRecordInput): Promise<RecordEntity> => {
    const { workflowIds, allowOverwrite, overwriteFields, ...recordData } = params;

    const existing = await client.record.findFirst({
      where: { workspaceId, sourceRecordId: params.sourceRecordId }
    });

    if (existing) {
      if (!allowOverwrite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Record with sourceRecordId '${params.sourceRecordId}' already exists. Use allowOverwrite=true with overwriteFields to update.`
        });
      }

      const picked = pickOverwriteFields(params, overwriteFields ?? []);
      const updateData = toPrismaUpdate(picked, existing as unknown as RecordEntity);

      logger.verbose("updating existing record", {
        id: existing.id,
        sourceRecordId: params.sourceRecordId,
        workspaceId
      });

      const record = await client.record.update({
        where: { id: existing.id },
        data: updateData as Parameters<DbClient["record"]["update"]>[0]["data"]
      });

      logger.verbose("record updated", { id: record.id, title: record.title });
      return record;
    }

    logger.verbose("creating record", { title: params.title, workspaceId });

    const record = await client.record.create({
      data: {
        ...recordData,
        workspaceId
      }
    });

    if (workflowIds && workflowIds.length > 0) {
      await client.recordWorkflow.createMany({
        data: workflowIds.map((workflowId) => ({
          recordId: record.id,
          workflowId
        })),
        skipDuplicates: true
      });
    }

    logger.verbose("record created", { id: record.id, title: record.title });
    return record;
  };

  return withErrorHandlingAndValidation(fn, createRecordSchema);
}
