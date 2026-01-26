/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { z } from "zod/v4";
import { recordStatusEnum } from "./schedulerRules.js";

/**
 * Schema for scheduler rules in a workflow file.
 * All fields are optional since they have defaults in the database.
 */
export const schedulerRulesFileSchema = z.object({
  // Timing rules
  minDaysBetweenActions: z.number().int().min(0).optional(),
  maxActionAttempts: z.number().int().min(1).optional(),
  recordTooRecentDays: z.number().int().min(0).optional(),
  recentUpdateCooldownDays: z.number().int().min(0).optional(),
  escalationThreshold: z.number().int().min(1).optional(),

  // Priority overrides
  highPriorityMinDays: z.number().int().min(0).optional(),
  lowPriorityMultiplier: z.number().min(1).optional(),

  // Filters
  enabledStatuses: z.array(recordStatusEnum).optional(),
  batchSize: z.number().int().min(1).max(500).optional()
});

/**
 * Input type for scheduler rules in a workflow file.
 */
export type SchedulerRulesFileInput = z.infer<typeof schedulerRulesFileSchema>;

/**
 * Schema for a workflow file (JSON or YAML).
 * Used for `ol workflows:create --from-file` and `ol workflows:update --from-file`.
 */
export const workflowFileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  tools: z.array(z.string()).nullable().optional(),
  schedule: z.string().nullable().optional(),

  // Template fields
  emailTemplate: z.string().nullable().optional(),
  callPrompt: z.string().nullable().optional(),

  // Nested scheduler rules
  schedulerRules: schedulerRulesFileSchema.optional()
});

/**
 * Input type for a workflow file.
 */
export type WorkflowFileInput = z.infer<typeof workflowFileSchema>;

/**
 * Schema for updating a workflow from a file.
 * Same as create but name is optional (can keep existing name).
 */
export const workflowUpdateFileSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  tools: z.array(z.string()).nullable().optional(),
  schedule: z.string().nullable().optional(),

  // Template fields
  emailTemplate: z.string().nullable().optional(),
  callPrompt: z.string().nullable().optional(),

  // Nested scheduler rules
  schedulerRules: schedulerRulesFileSchema.optional()
});

/**
 * Input type for updating a workflow from a file.
 */
export type WorkflowUpdateFileInput = z.infer<typeof workflowUpdateFileSchema>;
