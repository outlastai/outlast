/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { z } from "zod/v4";

/**
 * Valid record statuses for workflow processing.
 */
export const recordStatusEnum = z.enum(["OPEN", "DONE", "BLOCKED", "ARCHIVED"]);

/**
 * Schema for creating scheduler rules for a workflow.
 */
export const createSchedulerRulesSchema = z.object({
  workflowId: z.uuid({ error: "Invalid workflow ID" }),

  // Timing rules
  minDaysBetweenActions: z.number().int().min(0).default(3),
  maxActionAttempts: z.number().int().min(1).default(5),
  recordTooRecentDays: z.number().int().min(0).default(1),
  recentUpdateCooldownDays: z.number().int().min(0).default(1),
  escalationThreshold: z.number().int().min(1).default(3),

  // Priority overrides
  highPriorityMinDays: z.number().int().min(0).default(1),
  lowPriorityMultiplier: z.number().min(1).default(2),

  // Filters
  enabledStatuses: z.array(recordStatusEnum).default(["OPEN"]),
  batchSize: z.number().int().min(1).max(500).default(50)
});

/**
 * Input type for creating scheduler rules.
 */
export type CreateSchedulerRulesInput = z.infer<typeof createSchedulerRulesSchema>;

/**
 * Schema for updating scheduler rules.
 */
export const updateSchedulerRulesSchema = z.object({
  id: z.uuid({ error: "Invalid scheduler rules ID" }),

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
 * Input type for updating scheduler rules.
 */
export type UpdateSchedulerRulesInput = z.infer<typeof updateSchedulerRulesSchema>;

/**
 * Schema for getting scheduler rules by workflow ID.
 */
export const getSchedulerRulesByWorkflowSchema = z.object({
  workflowId: z.uuid({ error: "Invalid workflow ID" })
});

/**
 * Input type for getting scheduler rules.
 */
export type GetSchedulerRulesByWorkflowInput = z.infer<typeof getSchedulerRulesByWorkflowSchema>;

/**
 * Schema for deleting scheduler rules.
 */
export const deleteSchedulerRulesSchema = z.object({
  id: z.uuid({ error: "Invalid scheduler rules ID" })
});

/**
 * Input type for deleting scheduler rules.
 */
export type DeleteSchedulerRulesInput = z.infer<typeof deleteSchedulerRulesSchema>;
