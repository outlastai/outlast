/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { logger } from "../../logger.js";
import type { RunnerDbClient, SchedulableWorkflow } from "./types.js";

/**
 * Transform Prisma workflow into schedulable workflow type.
 */
function toSchedulableWorkflow(prismaWorkflow: {
  id: string;
  name: string;
  schedule: string | null;
}): SchedulableWorkflow {
  return {
    id: prismaWorkflow.id,
    name: prismaWorkflow.name,
    schedule: prismaWorkflow.schedule
  };
}

/**
 * Creates a function to list workflows that have schedules.
 *
 * @param client - The database client
 * @returns A function that lists schedulable workflows
 */
export function createListSchedulableWorkflows(client: RunnerDbClient) {
  return async (): Promise<SchedulableWorkflow[]> => {
    logger.verbose("listing schedulable workflows");

    const workflows = await client.workflow.findMany({
      where: { schedule: { not: null } }
    });

    logger.verbose("schedulable workflows listed", { count: workflows.length });
    return workflows.map(toSchedulableWorkflow);
  };
}
