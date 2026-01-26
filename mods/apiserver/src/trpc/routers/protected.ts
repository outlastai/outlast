/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  listRecordsSchema,
  getRecordHistorySchema,
  createContactSchema,
  deleteContactSchema,
  listContactsSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  deleteWorkflowSchema,
  listWorkflowsSchema
} from "@outlast/common";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import {
  createCreateRecord,
  createUpdateRecord,
  createDeleteRecord,
  createListRecords,
  createGetRecordHistory
} from "../../api/records/index.js";
import {
  createCreateContact,
  createDeleteContact,
  createListContacts
} from "../../api/contacts/index.js";
import {
  createCreateWorkflow,
  createUpdateWorkflow,
  createDeleteWorkflow,
  createListWorkflows
} from "../../api/workflows/index.js";

/**
 * Helper to get workspace ID from context.
 * Throws UNAUTHORIZED if no workspace context is available.
 */
function getWorkspaceId(ctx: { accessKeyId?: string }): string {
  if (!ctx.accessKeyId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No workspace context. Provide x-access-key-id header."
    });
  }
  return ctx.accessKeyId;
}

/**
 * Protected router - procedures that require authentication.
 */
export const protectedRouter = router({
  // ===========================================================================
  // Records
  // ===========================================================================

  /**
   * Create a new record.
   */
  createRecord: protectedProcedure.input(createRecordSchema).mutation(async ({ ctx, input }) => {
    const workspaceId = getWorkspaceId(ctx);
    const fn = createCreateRecord(ctx.db, workspaceId);
    return fn(input);
  }),

  /**
   * Update an existing record.
   */
  updateRecord: protectedProcedure.input(updateRecordSchema).mutation(async ({ ctx, input }) => {
    const fn = createUpdateRecord(ctx.db);
    return fn(input);
  }),

  /**
   * Delete a record by ID.
   */
  deleteRecord: protectedProcedure.input(deleteRecordSchema).mutation(async ({ ctx, input }) => {
    const fn = createDeleteRecord(ctx.db);
    return fn(input);
  }),

  /**
   * List records with optional pagination and filtering.
   */
  listRecords: protectedProcedure.input(listRecordsSchema).query(async ({ ctx, input }) => {
    const fn = createListRecords(ctx.db);
    return fn(input);
  }),

  /**
   * Get history for a specific record.
   */
  getRecordHistory: protectedProcedure
    .input(getRecordHistorySchema)
    .query(async ({ ctx, input }) => {
      const fn = createGetRecordHistory(ctx.db);
      return fn(input);
    }),

  // ===========================================================================
  // Contacts
  // ===========================================================================

  /**
   * Create a new contact.
   */
  createContact: protectedProcedure.input(createContactSchema).mutation(async ({ ctx, input }) => {
    const workspaceId = getWorkspaceId(ctx);
    const fn = createCreateContact(ctx.db, workspaceId);
    return fn(input);
  }),

  /**
   * Delete a contact by ID.
   */
  deleteContact: protectedProcedure.input(deleteContactSchema).mutation(async ({ ctx, input }) => {
    const fn = createDeleteContact(ctx.db);
    return fn(input);
  }),

  /**
   * List contacts with optional pagination.
   */
  listContacts: protectedProcedure.input(listContactsSchema).query(async ({ ctx, input }) => {
    const fn = createListContacts(ctx.db);
    return fn(input);
  }),

  // ===========================================================================
  // Workflows
  // ===========================================================================

  /**
   * Create a new workflow.
   */
  createWorkflow: protectedProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx);
      const fn = createCreateWorkflow(ctx.db, workspaceId);
      return fn(input);
    }),

  /**
   * Update an existing workflow.
   */
  updateWorkflow: protectedProcedure
    .input(updateWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = createUpdateWorkflow(ctx.db);
      return fn(input);
    }),

  /**
   * Delete a workflow by ID.
   */
  deleteWorkflow: protectedProcedure
    .input(deleteWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const fn = createDeleteWorkflow(ctx.db);
      return fn(input);
    }),

  /**
   * List workflows with optional pagination.
   */
  listWorkflows: protectedProcedure.input(listWorkflowsSchema).query(async ({ ctx, input }) => {
    const fn = createListWorkflows(ctx.db);
    return fn(input);
  })
});
