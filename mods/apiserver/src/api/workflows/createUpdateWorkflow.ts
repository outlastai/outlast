/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  updateWorkflowSchema,
  type UpdateWorkflowInput,
  type DbClient,
  type Workflow
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to update an existing workflow.
 *
 * @param client - The database client
 * @returns A validated function that updates a workflow
 */
export function createUpdateWorkflow(client: DbClient) {
  const fn = async (params: UpdateWorkflowInput): Promise<Workflow> => {
    logger.verbose("updating workflow", { id: params.id });

    const { id, ...data } = params;

    const workflow = await client.workflow.update({
      where: { id },
      data
    });

    logger.verbose("workflow updated", { id: workflow.id, name: workflow.name });
    return workflow;
  };

  return withErrorHandlingAndValidation(fn, updateWorkflowSchema);
}
