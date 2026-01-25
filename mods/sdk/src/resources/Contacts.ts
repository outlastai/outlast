/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import type { Client } from "../Client.js";
import type {
  CreateContactRequest,
  DeleteContactRequest,
  ListContactsRequest,
  Contact
} from "../types.js";

/**
 * @classdesc Outlast Contacts, part of the Outlast API subsystem,
 * allows you to create and manage contacts in the system.
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
 *     const contacts = new SDK.Contacts(client);
 *     const response = await contacts.createContact(request);
 *
 *     console.log(response); // successful response
 *   } catch (e) {
 *     console.error(e); // an error occurred
 *   }
 * }
 *
 * const request = {
 *   name: "John Doe",
 *   preferredChannel: "EMAIL"
 * };
 *
 * main(request);
 */
class Contacts {
  private readonly client: Client;

  /**
   * Constructs a new Contacts object.
   *
   * @param {Client} client - Client object with underlying implementations to make requests to Outlast's API
   * @see Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Creates a new Contact in the system.
   *
   * @param {CreateContactRequest} request - The request object that contains the necessary information to create a new Contact
   * @param {string} request.name - The name of the Contact
   * @param {string} request.preferredChannel - The preferred contact channel (EMAIL, PHONE, SMS, WHATSAPP)
   * @param {string} [request.email] - The email address of the Contact
   * @param {string} [request.phone] - The phone number of the Contact
   * @return {Promise<Contact>} - The response object that contains the created Contact
   * @example
   * const contacts = new SDK.Contacts(client);
   *
   * const request = {
   *   name: "John Doe",
   *   email: "john@example.com",
   *   preferredChannel: "EMAIL"
   * };
   *
   * contacts
   *   .createContact(request)
   *   .then(console.log) // successful response
   *   .catch(console.error); // an error occurred
   */
  async createContact(request: CreateContactRequest): Promise<Contact> {
    return this.client.request((trpc) => trpc.createContact.mutate(request)) as Promise<Contact>;
  }

  /**
   * Deletes a Contact from the system.
   *
   * @param {DeleteContactRequest} request - The request object containing the contact ID to delete
   * @param {string} request.id - The ID of the Contact to delete
   * @return {Promise<Contact>} - The response object that contains the deleted Contact
   * @example
   * const contacts = new SDK.Contacts(client);
   *
   * contacts
   *   .deleteContact({ id: "contact-id" })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async deleteContact(request: DeleteContactRequest): Promise<Contact> {
    return this.client.request((trpc) => trpc.deleteContact.mutate(request)) as Promise<Contact>;
  }

  /**
   * Lists Contacts with optional pagination.
   *
   * @param {ListContactsRequest} [request={}] - Optional request object for pagination
   * @param {number} [request.skip] - Number of contacts to skip
   * @param {number} [request.take] - Maximum number of contacts to return
   * @return {Promise<Contact[]>} - The response array containing the Contacts
   * @example
   * const contacts = new SDK.Contacts(client);
   *
   * // List all contacts
   * contacts
   *   .listContacts()
   *   .then(console.log)
   *   .catch(console.error);
   *
   * // List with pagination
   * contacts
   *   .listContacts({ skip: 0, take: 10 })
   *   .then(console.log)
   *   .catch(console.error);
   */
  async listContacts(request: ListContactsRequest = {}): Promise<Contact[]> {
    return this.client.request((trpc) => trpc.listContacts.query(request)) as Promise<Contact[]>;
  }
}

export { Contacts };
