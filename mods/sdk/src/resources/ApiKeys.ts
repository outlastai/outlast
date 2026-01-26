/**
 * Copyright (C) 2026 by Outlast.
 */
import type { Client } from "../Client.js";
import type {
  CreateApiKeyResponse,
  ListApiKeysResponse,
  RegenerateApiKeyResponse
} from "../types.js";

type CreateApiKeyRequest = {
  role: "WORKSPACE_OWNER" | "WORKSPACE_ADMIN" | "WORKSPACE_MEMBER";
  expiresAt?: number;
};

type ListApiKeysRequest = {
  pageSize?: number;
  pageToken?: string;
};

/**
 * @classdesc Outlast ApiKeys, part of the Outlast Identity subsystem,
 * allows you to create, update, retrieve, and delete ApiKeys for your deployment.
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
 *     const apiKeys = new SDK.ApiKeys(client);
 *     const response = await apiKeys.createApiKey(request);
 *
 *     console.log(response); // successful response
 *   } catch (e) {
 *     console.error(e); // an error occurred
 *   }
 * }
 *
 * const request = {
 *   role: "WORKSPACE_ADMIN"
 * };
 *
 * main(request);
 */
class ApiKeys {
  private readonly client: Client;

  /**
   * Constructs a new ApiKeys object.
   *
   * @param {Client} client - Client object with underlying implementations to make requests to Outlast's API
   * @see Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Creates a new ApiKey for a Workspace.
   *
   * @param {CreateApiKeyRequest} request - The request object that contains the necessary information to create a new ApiKey
   * @param {string} request.role - The role of the ApiKey
   * @param {number} [request.expiresAt] - Optional expiration time (epoch seconds)
   * @return {Promise<CreateApiKeyResponse>} - The response object that contains the reference to the created ApiKey
   * @example
   * const apiKeys = new SDK.ApiKeys(client); // Existing client object
   *
   * const request = {
   *   role: "WORKSPACE_ADMIN"
   * };
   *
   * apiKeys
   *   .createApiKey(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async createApiKey(request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.client.request((trpc) =>
      trpc.identity.apiKeys.create.mutate(request)
    ) as Promise<CreateApiKeyResponse>;
  }

  /**
   * Retrieves a list of ApiKeys from a Workspace.
   *
   * @param {ListApiKeysRequest} request - The request object that contains the necessary information to retrieve a list of ApiKeys
   * @param {number} [request.pageSize] - The number of ApiKeys to retrieve
   * @param {string} [request.pageToken] - The token to retrieve the next page of ApiKeys
   * @return {Promise<ListApiKeysResponse>} - The response object that contains the list of ApiKeys
   * @example
   * const apiKeys = new SDK.ApiKeys(client); // Existing client object
   *
   * const request = {
   *   pageSize: 10
   * };
   *
   * apiKeys
   *   .listApiKeys(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async listApiKeys(request: ListApiKeysRequest = {}): Promise<ListApiKeysResponse> {
    return this.client.request((trpc) =>
      trpc.identity.apiKeys.list.query(request)
    ) as Promise<ListApiKeysResponse>;
  }

  /**
   * Regenerates an existing ApiKey for a Workspace.
   * Note that this operation is irreversible.
   *
   * @param {string} ref - The reference of the ApiKey to regenerate
   * @return {Promise<RegenerateApiKeyResponse>} - The response object that contains the regenerated ApiKey
   * @example
   * const apiKeys = new SDK.ApiKeys(client); // Existing client object
   *
   * const ref = "00000000-0000-0000-0000-000000000000";
   *
   * apiKeys
   *   .regenerateApiKey(ref)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async regenerateApiKey(ref: string): Promise<RegenerateApiKeyResponse> {
    return this.client.request((trpc) =>
      trpc.identity.apiKeys.regenerate.mutate({ ref })
    ) as Promise<RegenerateApiKeyResponse>;
  }

  /**
   * Deletes an existing ApiKey from Outlast.
   * Note that this operation is irreversible.
   *
   * @param {string} ref - The reference of the ApiKey to delete
   * @return {Promise<{ ref: string }>} - The response object that contains the reference to the deleted ApiKey
   * @example
   * const apiKeys = new SDK.ApiKeys(client); // Existing client object
   *
   * const ref = "00000000-0000-0000-0000-000000000000";
   *
   * apiKeys
   *   .deleteApiKey(ref)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async deleteApiKey(ref: string): Promise<{ ref: string }> {
    return this.client.request((trpc) => trpc.identity.apiKeys.delete.mutate({ ref })) as Promise<{
      ref: string;
    }>;
  }
}

export { ApiKeys };
