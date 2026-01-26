/**
 * Copyright (C) 2026 by Outlast.
 */
import { z } from "zod/v4";

/**
 * Schema for creating a new contact.
 */
export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email().nullable().optional(),
  phone: z.string().nullable().optional(),
  preferredChannel: z.enum(["EMAIL", "PHONE", "SMS", "WHATSAPP"])
});

/**
 * Input type for creating a contact.
 */
export type CreateContactInput = z.infer<typeof createContactSchema>;

/**
 * Schema for getting a contact by ID.
 */
export const getContactSchema = z.object({
  id: z.uuid({ error: "Invalid contact ID" })
});

/**
 * Input type for getting a contact.
 */
export type GetContactInput = z.infer<typeof getContactSchema>;

/**
 * Schema for deleting a contact by ID.
 */
export const deleteContactSchema = z.object({
  id: z.uuid({ error: "Invalid contact ID" })
});

/**
 * Input type for deleting a contact.
 */
export type DeleteContactInput = z.infer<typeof deleteContactSchema>;

/**
 * Schema for listing contacts with optional pagination.
 */
export const listContactsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional()
});

/**
 * Input type for listing contacts.
 */
export type ListContactsInput = z.infer<typeof listContactsSchema>;
