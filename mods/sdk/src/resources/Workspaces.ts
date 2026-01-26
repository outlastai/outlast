/**
 * Copyright (C) 2026 by Outlast.
 */
import type { Client } from "../Client.js";
import type {
  CreateWorkspaceRequest,
  DeleteWorkspaceResponse,
  ListWorkspacesResponse,
  UpdateWorkspaceRequest,
  Workspace
} from "../types.js";

/**
 * @classdesc Outlast Workspaces, part of the Outlast Identity subsystem,
 * allows you to create, update, retrieve, and delete Workspaces in the system.
 * Note that an active Outlast deployment is required.
 *
 * @example
 *
 * const SDK = require("@outlast/sdk");
 *
 * async function main(request) {
 *   const apiKey = "your-api-key";
 *   const apiSecret = "your-api-secret";
 *   const accessKeyId = "WO00000000000000000000000000000000";
 *
 *   try {
 *     const client = new SDK.Client({ accessKeyId });
 *     await client.loginWithApiKey(apiKey, apiSecret);
 *
 *     const workspaces = new SDK.Workspaces(client);
 *     const response = await workspaces.createWorkspace(request);
 *
 *     console.log(response); // successful response
 *   } catch (e) {
 *     console.error(e); // an error occurred
 *   }
 * }
 *
 * const request = {
 *   name: "My Workspace"
 * };
 *
 * main(request);
 */
class Workspaces {
  private readonly client: Client;

  /**
   * Constructs a new Workspaces object.
   *
   * @param {Client} client - Client object with underlying implementations to make requests to Outlast's API
   * @see Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Creates a new Workspace in the system.
   *
   * @param {CreateWorkspaceRequest} request - The request object that contains the necessary information to create a new Workspace
   * @param {string} request.name - The name of the Workspace
   * @return {Promise<Workspace>} - The response object that contains the created Workspace
   * @example
   * const workspaces = new SDK.Workspaces(client); // Existing client object
   *
   * const request = {
   *   name: "My Workspace"
   * };
   *
   * workspaces
   *   .createWorkspace(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async createWorkspace(request: CreateWorkspaceRequest): Promise<Workspace> {
    return this.client.request((trpc) =>
      trpc.identity.workspaces.create.mutate(request)
    ) as Promise<Workspace>;
  }

  /**
   * Retrieves an existing Workspace in the system.
   *
   * @param {string} ref - The reference of the Workspace to retrieve
   * @return {Promise<Workspace>} - The response object that contains the Workspace
   * @example
   * const workspaces = new SDK.Workspaces(client); // Existing client object
   *
   * const ref = "00000000-0000-0000-0000-000000000000";
   *
   * workspaces
   *   .getWorkspace(ref)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async getWorkspace(ref: string): Promise<Workspace> {
    return this.client.request((trpc) =>
      trpc.identity.workspaces.get.query({ ref })
    ) as Promise<Workspace>;
  }

  /**
   * Updates an existing Workspace in the system.
   *
   * @param {UpdateWorkspaceRequest} request - The request object that contains the necessary information to update a Workspace
   * @param {string} request.ref - The reference of the Workspace to update
   * @param {string} request.name - The name of the Workspace
   * @return {Promise<Workspace>} - The response object that contains the updated Workspace
   * @example
   * const workspaces = new SDK.Workspaces(client); // Existing client object
   *
   * const request = {
   *   ref: "00000000-0000-0000-0000-000000000000",
   *   name: "My Workspace"
   * };
   *
   * workspaces
   *   .updateWorkspace(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async updateWorkspace(request: UpdateWorkspaceRequest): Promise<Workspace> {
    return this.client.request((trpc) =>
      trpc.identity.workspaces.update.mutate(request)
    ) as Promise<Workspace>;
  }

  /**
   * Deletes an existing Workspace from Outlast.
   * Note that this operation is irreversible.
   *
   * @param {string} ref - The reference of the Workspace to delete
   * @return {Promise<DeleteWorkspaceResponse>} - The response object that contains the reference to the deleted Workspace
   * @example
   * const workspaces = new SDK.Workspaces(client); // Existing client object
   *
   * const ref = "00000000-0000-0000-0000-000000000000";
   *
   * workspaces
   *   .deleteWorkspace(ref)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async deleteWorkspace(ref: string): Promise<DeleteWorkspaceResponse> {
    return this.client.request((trpc) =>
      trpc.identity.workspaces.delete.mutate({ ref })
    ) as Promise<DeleteWorkspaceResponse>;
  }

  /**
   * Retrieves a list of all Workspaces for the logged in user.
   *
   * @return {Promise<ListWorkspacesResponse>} - The response object that contains the list of Workspaces
   * @example
   * const workspaces = new SDK.Workspaces(client); // Existing client object
   *
   * workspaces
   *   .listWorkspaces()
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async listWorkspaces(): Promise<ListWorkspacesResponse> {
    return this.client.request((trpc) =>
      trpc.identity.workspaces.list.query()
    ) as Promise<ListWorkspacesResponse>;
  }
}

export { Workspaces };
