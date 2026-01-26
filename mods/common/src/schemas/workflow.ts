/**
 * Copyright (C) 2026 by Outlast.
 */
import { z } from "zod/v4";

/**
 * Schema for creating a new workflow.
 */
export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  tools: z.array(z.unknown()).nullable().optional(),
  schedule: z.string().nullable().optional(),
  emailTemplate: z.string().nullable().optional(),
  callPrompt: z.string().nullable().optional()
});

/**
 * Input type for creating a workflow.
 */
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

/**
 * Schema for getting a workflow by ID.
 */
export const getWorkflowSchema = z.object({
  id: z.uuid({ error: "Invalid workflow ID" })
});

/**
 * Input type for getting a workflow.
 */
export type GetWorkflowInput = z.infer<typeof getWorkflowSchema>;

/**
 * Schema for updating an existing workflow.
 */
export const updateWorkflowSchema = z.object({
  id: z.uuid({ error: "Invalid workflow ID" }),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  tools: z.array(z.unknown()).nullable().optional(),
  schedule: z.string().nullable().optional(),
  emailTemplate: z.string().nullable().optional(),
  callPrompt: z.string().nullable().optional()
});

/**
 * Input type for updating a workflow.
 */
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

/**
 * Schema for deleting a workflow by ID.
 */
export const deleteWorkflowSchema = z.object({
  id: z.uuid({ error: "Invalid workflow ID" })
});

/**
 * Input type for deleting a workflow.
 */
export type DeleteWorkflowInput = z.infer<typeof deleteWorkflowSchema>;

/**
 * Schema for listing workflows with optional pagination.
 */
export const listWorkflowsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional()
});

/**
 * Input type for listing workflows.
 */
export type ListWorkflowsInput = z.infer<typeof listWorkflowsSchema>;
