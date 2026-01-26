/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  withErrorHandlingAndValidation,
  deleteContactSchema,
  type DeleteContactInput,
  type DbClient,
  type Contact
} from "@outlast/common";
import { logger } from "../../logger.js";

/**
 * Creates a function to delete a contact by ID.
 *
 * @param client - The database client
 * @returns A validated function that deletes a contact
 */
export function createDeleteContact(client: DbClient) {
  const fn = async (params: DeleteContactInput): Promise<Contact> => {
    logger.verbose("deleting contact", { id: params.id });

    const contact = await client.contact.delete({
      where: { id: params.id }
    });

    logger.verbose("contact deleted", { id: contact.id });
    return contact;
  };

  return withErrorHandlingAndValidation(fn, deleteContactSchema);
}
