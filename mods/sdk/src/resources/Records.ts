/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { Client } from "../Client.js";
import type {
  CreateRecordRequest,
  UpdateRecordRequest,
  DeleteRecordRequest,
  ListRecordsRequest,
  GetRecordHistoryRequest,
  RecordEntity,
  RecordHistory
} from "../types.js";

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
   * @return {Promise<RecordEntity>} - The response object that contains the created Record
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
  async createRecord(request: CreateRecordRequest): Promise<RecordEntity> {
    return this.client.request((trpc) =>
      trpc.createRecord.mutate(request)
    ) as Promise<RecordEntity>;
  }

  /**
   * Updates an existing Record in the system.
   *
   * @param {UpdateRecordRequest} request - The request object containing the record ID and fields to update
   * @param {string} request.id - The ID of the Record to update
   * @param {string} [request.title] - The new title of the Record
   * @param {string} [request.status] - The new status of the Record
   * @return {Promise<RecordEntity>} - The response object that contains the updated Record
   * @example
   * const records = new SDK.Records(client);
   *
   * records
   *   .updateRecord({ id: "record-id", title: "Updated Title", status: "DONE" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async updateRecord(request: UpdateRecordRequest): Promise<RecordEntity> {
    return this.client.request((trpc) =>
      trpc.updateRecord.mutate(request)
    ) as Promise<RecordEntity>;
  }

  /**
   * Deletes a Record from the system.
   *
   * @param {DeleteRecordRequest} request - The request object containing the record ID to delete
   * @param {string} request.id - The ID of the Record to delete
   * @return {Promise<RecordEntity>} - The response object that contains the deleted Record
   * @example
   * const records = new SDK.Records(client);
   *
   * records
   *   .deleteRecord({ id: "record-id" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async deleteRecord(request: DeleteRecordRequest): Promise<RecordEntity> {
    return this.client.request((trpc) =>
      trpc.deleteRecord.mutate(request)
    ) as Promise<RecordEntity>;
  }

  /**
   * Lists Records with optional pagination and filtering.
   *
   * @param {ListRecordsRequest} [request={}] - Optional request object for pagination and filtering
   * @param {number} [request.skip] - Number of records to skip
   * @param {number} [request.take] - Maximum number of records to return
   * @param {string} [request.status] - Filter by status
   * @param {string} [request.type] - Filter by type
   * @return {Promise<RecordEntity[]>} - The response array containing the Records
   * @example
   * const records = new SDK.Records(client);
   *
   * // List all records
   * records
   *   .listRecords()
   *   .then(console.log)
   *   .catch(console.error);
   *
   * // List with pagination
   * records
   *   .listRecords({ skip: 0, take: 10, status: "OPEN" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async listRecords(request: ListRecordsRequest = {}): Promise<RecordEntity[]> {
    return this.client.request((trpc) => trpc.listRecords.query(request)) as Promise<
      RecordEntity[]
    >;
  }

  /**
   * Gets the history for a specific Record.
   *
   * @param {GetRecordHistoryRequest} request - The request object containing the record ID
   * @param {string} request.recordId - The ID of the Record to get history for
   * @param {number} [request.skip] - Number of history entries to skip
   * @param {number} [request.take] - Maximum number of history entries to return
   * @return {Promise<RecordHistory[]>} - The response array containing the RecordHistory entries
   * @example
   * const records = new SDK.Records(client);
   *
   * records
   *   .getRecordHistory({ recordId: "record-id" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async getRecordHistory(request: GetRecordHistoryRequest): Promise<RecordHistory[]> {
    return this.client.request((trpc) => trpc.getRecordHistory.query(request)) as Promise<
      RecordHistory[]
    >;
  }
}

export { Records };
