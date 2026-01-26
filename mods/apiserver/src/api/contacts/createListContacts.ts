/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  listContactsSchema,
  type ListContactsInput,
  type DbClient,
  type Contact
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to list contacts with optional pagination.
 *
 * @param client - The database client
 * @returns A validated function that lists contacts
 */
export function createListContacts(client: DbClient) {
  const fn = async (params: ListContactsInput): Promise<Contact[]> => {
    logger.verbose("listing contacts", { skip: params.skip, take: params.take });

    const contacts = await client.contact.findMany({
      skip: params.skip,
      take: params.take
    });

    logger.verbose("contacts listed", { count: contacts.length });
    return contacts;
  };

  return withErrorHandlingAndValidation(fn, listContactsSchema);
}
