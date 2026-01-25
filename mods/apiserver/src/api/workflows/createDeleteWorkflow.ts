/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import {
  withErrorHandlingAndValidation,
  deleteWorkflowSchema,
  type DeleteWorkflowInput,
  type DbClient,
  type Workflow
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to delete a workflow by ID.
 *
 * @param client - The database client
 * @returns A validated function that deletes a workflow
 */
export function createDeleteWorkflow(client: DbClient) {
  const fn = async (params: DeleteWorkflowInput): Promise<Workflow> => {
    logger.verbose("deleting workflow", { id: params.id });

    const workflow = await client.workflow.delete({
      where: { id: params.id }
    });

    logger.verbose("workflow deleted", { id: workflow.id });
    return workflow;
  };

  return withErrorHandlingAndValidation(fn, deleteWorkflowSchema);
}
