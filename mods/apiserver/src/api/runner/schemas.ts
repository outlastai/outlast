/**
 * Copyright (C) 2026 by Outlast.
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
