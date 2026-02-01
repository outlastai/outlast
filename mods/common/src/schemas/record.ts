/**
 * Copyright (C) 2026 by Outlast.
 */
import { z } from "zod/v4";

/**
 * Record type enum values.
 */
export const RecordType = {
  GENERIC: "GENERIC",
  PURCHASE_ORDER: "PURCHASE_ORDER",
  INVENTORY_ITEM: "INVENTORY_ITEM",
  INVOICE: "INVOICE",
  SHIPMENT: "SHIPMENT",
  TICKET: "TICKET",
  RETURN: "RETURN"
} as const;

/**
 * Record status enum values.
 */
export const RecordStatus = {
  OPEN: "OPEN",
  DONE: "DONE",
  BLOCKED: "BLOCKED",
  ARCHIVED: "ARCHIVED"
} as const;

/**
 * Risk level enum values.
 */
export const RiskLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH"
} as const;

/**
 * Priority level enum values.
 */
export const PriorityLevel = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH"
} as const;

/**
 * Source system enum values.
 */
export const SourceSystem = {
  CSV: "CSV",
  ODOO: "ODOO",
  SALESFORCE: "SALESFORCE",
  SAP: "SAP",
  EMAIL: "EMAIL",
  MANUAL: "MANUAL"
} as const;

/**
 * Channel enum values.
 */
export const Channel = {
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP"
} as const;

const recordTypeEnum = z.enum([
  "GENERIC",
  "PURCHASE_ORDER",
  "INVENTORY_ITEM",
  "INVOICE",
  "SHIPMENT",
  "TICKET",
  "RETURN"
]);

const sourceSystemEnum = z.enum(["CSV", "ODOO", "SALESFORCE", "SAP", "EMAIL", "MANUAL"]);

/**
 * Schema for creating a new record.
 */
export const createRecordSchema = z
  .object({
    // Required fields
    title: z.string().min(1, "Title is required"),
    type: recordTypeEnum,
    sourceSystem: sourceSystemEnum,
    sourceRecordId: z.string().min(1, "Source record ID is required"),

    // Fields with defaults
    status: z.enum(["OPEN", "DONE", "BLOCKED", "ARCHIVED"]).default("OPEN"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),

    // Optional fields
    risk: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    contactId: z.uuid().nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    rawData: z.record(z.string(), z.unknown()).nullable().optional(),

    // Workflow associations
    workflowIds: z.array(z.uuid()).optional(),

    // Upsert options
    allowOverwrite: z.boolean().optional().default(false),
    overwriteFields: z.array(z.string()).optional()
  })
  .refine(
    (data) => !data.allowOverwrite || (data.overwriteFields && data.overwriteFields.length > 0),
    {
      message: "overwriteFields is required when allowOverwrite is true",
      path: ["overwriteFields"]
    }
  );

/**
 * Input type for creating a record.
 */
export type CreateRecordInput = z.infer<typeof createRecordSchema>;

/**
 * Schema for getting a record by ID.
 */
export const getRecordSchema = z.object({
  id: z.uuid({ error: "Invalid record ID" })
});

/**
 * Input type for getting a record.
 */
export type GetRecordInput = z.infer<typeof getRecordSchema>;

/**
 * Schema for updating an existing record.
 */
export const updateRecordSchema = z.object({
  id: z.uuid({ error: "Invalid record ID" }),
  title: z.string().min(1).optional(),
  type: z
    .enum([
      "GENERIC",
      "PURCHASE_ORDER",
      "INVENTORY_ITEM",
      "INVOICE",
      "SHIPMENT",
      "TICKET",
      "RETURN"
    ])
    .optional(),
  status: z.enum(["OPEN", "DONE", "BLOCKED", "ARCHIVED"]).optional(),
  risk: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable().optional(),
  contactId: z.uuid().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

/**
 * Input type for updating a record.
 */
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;

/**
 * Schema for deleting a record by ID.
 */
export const deleteRecordSchema = z.object({
  id: z.uuid({ error: "Invalid record ID" })
});

/**
 * Input type for deleting a record.
 */
export type DeleteRecordInput = z.infer<typeof deleteRecordSchema>;

/**
 * Schema for listing records with optional pagination.
 */
export const listRecordsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional(),
  status: z.enum(["OPEN", "DONE", "BLOCKED", "ARCHIVED"]).optional(),
  type: z
    .enum([
      "GENERIC",
      "PURCHASE_ORDER",
      "INVENTORY_ITEM",
      "INVOICE",
      "SHIPMENT",
      "TICKET",
      "RETURN"
    ])
    .optional()
});

/**
 * Input type for listing records.
 */
export type ListRecordsInput = z.infer<typeof listRecordsSchema>;

/**
 * Schema for getting record history.
 */
export const getRecordHistorySchema = z.object({
  recordId: z.uuid({ error: "Invalid record ID" }),
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional()
});

/**
 * Input type for getting record history.
 */
export type GetRecordHistoryInput = z.infer<typeof getRecordHistorySchema>;

/**
 * Schema for a record file (JSON or YAML).
 * Used for `ol records:create --from-file`.
 */
export const recordFileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: recordTypeEnum,
  sourceSystem: sourceSystemEnum,
  sourceRecordId: z.string().min(1, "Source record ID is required"),
  status: z.enum(["OPEN", "DONE", "BLOCKED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  risk: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  contactId: z.uuid().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  rawData: z.record(z.string(), z.unknown()).nullable().optional(),
  workflowIds: z.array(z.uuid()).optional()
});

/**
 * Input type for a record file.
 */
export type RecordFileInput = z.infer<typeof recordFileSchema>;
