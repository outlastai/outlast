/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import {
  withErrorHandlingAndValidation,
  createContactSchema,
  type CreateContactInput,
  type DbClient,
  type Contact
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to create a new contact.
 *
 * @param client - The database client
 * @param workspaceId - The workspace ID to create the contact in
 * @returns A validated function that creates a contact
 */
export function createCreateContact(client: DbClient, workspaceId: string) {
  const fn = async (params: CreateContactInput): Promise<Contact> => {
    logger.verbose("creating contact", { name: params.name, workspaceId });

    const contact = await client.contact.create({
      data: {
        ...params,
        workspaceId
      }
    });

    logger.verbose("contact created", { id: contact.id, name: contact.name });
    return contact;
  };

  return withErrorHandlingAndValidation(fn, createContactSchema);
}
