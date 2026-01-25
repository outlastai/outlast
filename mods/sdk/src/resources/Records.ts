/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { Client } from "../Client.js";
import type { CreateRecordRequest, Record } from "../types.js";

/**
 * @classdesc Outlast Records, part of the Outlast API subsystem,
 * allows you to create and manage records in the system.
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
 *     const records = new SDK.Records(client);
 *     const response = await records.createRecord(request);
 *
 *     console.log(response); // successful response
 *   } catch (e) {
 *     console.error(e); // an error occurred
 *   }
 * }
 *
 * const request = {
 *   title: "My Record"
 * };
 *
 * main(request);
 */
class Records {
  private readonly client: Client;

  /**
   * Constructs a new Records object.
   *
   * @param {Client} client - Client object with underlying implementations to make requests to Outlast's API
   * @see Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Creates a new Record in the system.
   *
   * @param {CreateRecordRequest} request - The request object that contains the necessary information to create a new Record
   * @param {string} request.title - The title of the Record
   * @return {Promise<Record>} - The response object that contains the created Record
   * @example
   * const records = new SDK.Records(client); // Existing client object
   *
   * const request = {
   *   title: "My Record"
   * };
   *
   * records
   *   .createRecord(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async createRecord(request: CreateRecordRequest): Promise<Record> {
    return this.client.request((trpc) => trpc.createRecord.mutate(request)) as Promise<Record>;
  }
}

export { Records };
