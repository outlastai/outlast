/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { z } from "zod/v4";

/**
 * Schema for creating a new record.
 */
export const createRecordSchema = z.object({
  title: z.string().min(1, "Title is required")
});

/**
 * Input type for creating a record.
 */
export type CreateRecordInput = z.infer<typeof createRecordSchema>;

/**
 * Schema for getting a record by ID.
 */
export const getRecordSchema = z.object({
  id: z.uuid({ error: "Invalid record ID" })
});

/**
 * Input type for getting a record.
 */
export type GetRecordInput = z.infer<typeof getRecordSchema>;

/**
 * Schema for listing records with optional pagination.
 */
export const listRecordsSchema = z.object({
  skip: z.number().int().min(0).optional(),
  take: z.number().int().min(1).max(100).optional()
});

/**
 * Input type for listing records.
 */
export type ListRecordsInput = z.infer<typeof listRecordsSchema>;
