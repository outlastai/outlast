/**
 * Copyright (C) 2026 by Outlast. MIT License.
 *
 * Local schemas for workflow runner operations (internal use only).
 */
import { z } from "zod/v4";

/**
 * Schema for getting a workflow with scheduler rules.
 */
export const getWorkflowWithRulesSchema = z.object({
  id: z.uuid({ error: "Invalid workflow ID" })
});

/**
 * Input type for getting a workflow with rules.
 */
export type GetWorkflowWithRulesInput = z.infer<typeof getWorkflowWithRulesSchema>;

/**
 * Schema for getting a record with contact.
 */
export const getRecordWithContactSchema = z.object({
  id: z.uuid({ error: "Invalid record ID" })
});

/**
 * Input type for getting a record with contact.
 */
export type GetRecordWithContactInput = z.infer<typeof getRecordWithContactSchema>;

/**
 * Schema for getting record history.
 */
export const getRecordHistorySchema = z.object({
  recordId: z.uuid({ error: "Invalid record ID" }),
  limit: z.number().int().min(1).max(100).optional()
});

/**
 * Input type for getting record history.
 */
export type GetRecordHistoryInput = z.infer<typeof getRecordHistorySchema>;

/**
 * Schema for creating a record history entry.
 */
export const createRecordHistorySchema = z.object({
  recordId: z.uuid({ error: "Invalid record ID" }),
  status: z.string().min(1, "Status is required"),
  aiNote: z.string().optional(),
  agent: z.string().min(1, "Agent is required"),
  channel: z.string().min(1, "Channel is required"),
  channelMetadata: z.record(z.string(), z.unknown()).optional()
});

/**
 * Input type for creating record history.
 */
export type CreateRecordHistoryInput = z.infer<typeof createRecordHistorySchema>;

/**
 * Schema for updating record status.
 */
export const updateRecordStatusSchema = z.object({
  id: z.uuid({ error: "Invalid record ID" }),
  status: z.string().min(1, "Status is required")
});

/**
 * Input type for updating record status.
 */
export type UpdateRecordStatusInput = z.infer<typeof updateRecordStatusSchema>;
