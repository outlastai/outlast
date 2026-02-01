/**
 * Copyright (C) 2026 by Outlast.
 */
import type { Client } from "../Client.js";
import type {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  DeleteWorkflowRequest,
  ListWorkflowsRequest,
  Workflow
} from "../types.js";

/**
 * @classdesc Outlast Workflows, part of the Outlast API subsystem,
 * allows you to create and manage workflows in the system.
 * Note that an active Outlast deployment is required.
 *
 * @example
 *
 * const SDK = require("@outlast/sdk");
 *
 * async function main(request) {
 *   const apiKey = "your-api-key";
 *   const apiSecret = "your-api-secret";
 *   const workspaceAccessKeyId = "WO00000000000000000000000000000000";
 *
 *   try {
 *     const client = new SDK.Client({ workspaceAccessKeyId });
 *     await client.loginWithApiKey(apiKey, apiSecret);
 *
 *     const workflows = new SDK.Workflows(client);
 *     const response = await workflows.createWorkflow(request);
 *
 *     console.log(response); // successful response
 *   } catch (e) {
 *     console.error(e); // an error occurred
 *   }
 * }
 *
 * const request = {
 *   name: "My Workflow"
 * };
 *
 * main(request);
 */
class Workflows {
  private readonly client: Client;

  /**
   * Constructs a new Workflows object.
   *
   * @param {Client} client - Client object with underlying implementations to make requests to Outlast's API
   * @see Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Creates a new Workflow in the system.
   *
   * @param {CreateWorkflowRequest} request - The request object that contains the necessary information to create a new Workflow
   * @param {string} request.name - The name of the Workflow
   * @param {string} [request.description] - The description of the Workflow
   * @param {string} [request.model] - The AI model to use
   * @param {string} [request.systemPrompt] - The system prompt for the workflow
   * @param {number} [request.temperature] - The temperature setting (0-2)
   * @param {unknown[]} [request.tools] - The tools available to the workflow
   * @param {object} [request.staticRules] - Static rules for the workflow
   * @param {string} [request.schedule] - Cron schedule for the workflow
   * @return {Promise<Workflow>} - The response object that contains the created Workflow
   * @example
   * const workflows = new SDK.Workflows(client);
   *
   * const request = {
   *   name: "My Workflow",
   *   model: "gpt-4",
   *   systemPrompt: "You are a helpful assistant"
   * };
   *
   * workflows
   *   .createWorkflow(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    return this.client.request((trpc) => trpc.createWorkflow.mutate(request)) as Promise<Workflow>;
  }

  /**
   * Updates an existing Workflow in the system.
   *
   * @param {UpdateWorkflowRequest} request - The request object containing the workflow ID and fields to update
   * @param {string} request.id - The ID of the Workflow to update
   * @param {string} [request.name] - The new name of the Workflow
   * @param {string} [request.description] - The new description
   * @param {string} [request.model] - The new AI model
   * @param {string} [request.systemPrompt] - The new system prompt
   * @param {number} [request.temperature] - The new temperature setting
   * @return {Promise<Workflow>} - The response object that contains the updated Workflow
   * @example
   * const workflows = new SDK.Workflows(client);
   *
   * workflows
   *   .updateWorkflow({ id: "workflow-id", name: "Updated Name" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async updateWorkflow(request: UpdateWorkflowRequest): Promise<Workflow> {
    return this.client.request((trpc) => trpc.updateWorkflow.mutate(request)) as Promise<Workflow>;
  }

  /**
   * Deletes a Workflow from the system.
   *
   * @param {DeleteWorkflowRequest} request - The request object containing the workflow ID to delete
   * @param {string} request.id - The ID of the Workflow to delete
   * @return {Promise<Workflow>} - The response object that contains the deleted Workflow
   * @example
   * const workflows = new SDK.Workflows(client);
   *
   * workflows
   *   .deleteWorkflow({ id: "workflow-id" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async deleteWorkflow(request: DeleteWorkflowRequest): Promise<Workflow> {
    return this.client.request((trpc) => trpc.deleteWorkflow.mutate(request)) as Promise<Workflow>;
  }

  /**
   * Lists Workflows with optional pagination.
   *
   * @param {ListWorkflowsRequest} [request={}] - Optional request object for pagination
   * @param {number} [request.skip] - Number of workflows to skip
   * @param {number} [request.take] - Maximum number of workflows to return
   * @return {Promise<Workflow[]>} - The response array containing the Workflows
   * @example
   * const workflows = new SDK.Workflows(client);
   *
   * // List all workflows
   * workflows
   *   .listWorkflows()
   *   .then(console.log)
   *   .catch(console.error);
   *
   * // List with pagination
   * workflows
   *   .listWorkflows({ skip: 0, take: 10 })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async listWorkflows(request: ListWorkflowsRequest = {}): Promise<Workflow[]> {
    return this.client.request((trpc) => trpc.listWorkflows.query(request)) as Promise<Workflow[]>;
  }
}

export { Workflows };
