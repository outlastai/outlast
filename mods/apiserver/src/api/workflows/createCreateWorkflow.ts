/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  createWorkflowSchema,
  type CreateWorkflowInput,
  type DbClient,
  type Workflow
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to create a new workflow.
 *
 * @param client - The database client
 * @param workspaceId - The workspace ID to create the workflow in
 * @returns A validated function that creates a workflow
 */
export function createCreateWorkflow(client: DbClient, workspaceId: string) {
  const fn = async (params: CreateWorkflowInput): Promise<Workflow> => {
    logger.verbose("creating workflow", { name: params.name, workspaceId });

    const workflow = await client.workflow.create({
      data: {
        ...params,
        workspaceId
      }
    });

    logger.verbose("workflow created", { id: workflow.id, name: workflow.name });
    return workflow;
  };

  return withErrorHandlingAndValidation(fn, createWorkflowSchema);
}
