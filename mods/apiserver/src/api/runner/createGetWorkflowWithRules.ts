/**
 * Copyright (C) 2026 by Outlast.
 */
import { withErrorHandlingAndValidation } from "@outlast/common";
import type { StaticRules, RecordStatus } from "@outlast/agents";
import { logger } from "../../logger.js";
import { getWorkflowWithRulesSchema, type GetWorkflowWithRulesInput } from "./schemas.js";
import type { RunnerDbClient, WorkflowWithRules } from "./types.js";

/**
 * Transform Prisma workflow + schedulerRules into domain type.
 */
function toWorkflowWithRules(prismaWorkflow: {
  id: string;
  name: string;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  tools: unknown;
  schedule: string | null;
  schedulerRules: {
    minDaysBetweenActions: number;
    maxActionAttempts: number;
    recordTooRecentDays: number;
    recentUpdateCooldownDays: number;
    highPriorityMinDays: number;
    lowPriorityMultiplier: number;
    enabledStatuses: unknown;
    escalationThreshold: number;
    batchSize: number;
  } | null;
}): WorkflowWithRules {
  const tools = Array.isArray(prismaWorkflow.tools) ? (prismaWorkflow.tools as string[]) : null;

  const schedulerRules: StaticRules | null = prismaWorkflow.schedulerRules
    ? {
        minDaysBetweenActions: prismaWorkflow.schedulerRules.minDaysBetweenActions,
        maxActionAttempts: prismaWorkflow.schedulerRules.maxActionAttempts,
        recordTooRecentDays: prismaWorkflow.schedulerRules.recordTooRecentDays,
        recentUpdateCooldownDays: prismaWorkflow.schedulerRules.recentUpdateCooldownDays,
        highPriorityMinDays: prismaWorkflow.schedulerRules.highPriorityMinDays,
        lowPriorityMultiplier: prismaWorkflow.schedulerRules.lowPriorityMultiplier,
        enabledStatuses: Array.isArray(prismaWorkflow.schedulerRules.enabledStatuses)
          ? (prismaWorkflow.schedulerRules.enabledStatuses as RecordStatus[])
          : ["OPEN"],
        escalationThreshold: prismaWorkflow.schedulerRules.escalationThreshold,
        batchSize: prismaWorkflow.schedulerRules.batchSize
      }
    : null;

  return {
    id: prismaWorkflow.id,
    name: prismaWorkflow.name,
    model: prismaWorkflow.model,
    systemPrompt: prismaWorkflow.systemPrompt,
    temperature: prismaWorkflow.temperature,
    tools,
    schedule: prismaWorkflow.schedule,
    schedulerRules
  };
}

/**
 * Creates a function to get a workflow with its scheduler rules.
 *
 * @param client - The database client
 * @returns A validated function that retrieves a workflow with rules
 */
export function createGetWorkflowWithRules(client: RunnerDbClient) {
  const fn = async (params: GetWorkflowWithRulesInput): Promise<WorkflowWithRules | null> => {
    logger.verbose("getting workflow with rules", { workflowId: params.id });

    const workflow = await client.workflow.findUnique({
      where: { id: params.id },
      include: { schedulerRules: true }
    });

    if (workflow) {
      logger.verbose("workflow retrieved", { workflowId: workflow.id, name: workflow.name });
      return toWorkflowWithRules(workflow);
    } else {
      logger.verbose("workflow not found", { workflowId: params.id });
      return null;
    }
  };

  return withErrorHandlingAndValidation(fn, getWorkflowWithRulesSchema);
}
