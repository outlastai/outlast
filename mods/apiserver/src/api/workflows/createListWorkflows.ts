/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  listWorkflowsSchema,
  type ListWorkflowsInput,
  type DbClient,
  type Workflow
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to list workflows with optional pagination.
 *
 * @param client - The database client
 * @returns A validated function that lists workflows
 */
export function createListWorkflows(client: DbClient) {
  const fn = async (params: ListWorkflowsInput): Promise<Workflow[]> => {
    logger.verbose("listing workflows", { skip: params.skip, take: params.take });

    const workflows = await client.workflow.findMany({
      skip: params.skip,
      take: params.take
    });

    logger.verbose("workflows listed", { count: workflows.length });
    return workflows;
  };

  return withErrorHandlingAndValidation(fn, listWorkflowsSchema);
}
