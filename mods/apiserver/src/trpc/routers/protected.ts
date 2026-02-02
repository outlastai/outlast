/**
 * Copyright (C) 2026 by Outlast.
 */
import {
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
  listRecordsSchema,
  getRecordHistorySchema,
  getRecordHistoryTimelineSchema,
  resumeWorkflowSchema,
  submitHumanReviewSchema,
  listPendingReviewsSchema,
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
  createGetRecordHistory,
  createGetRecordHistoryTimeline
} from "../../api/records/index.js";
import {
  createResumeWorkflow,
  createSubmitHumanReview,
  createListPendingReviews
} from "../../api/workflows/langgraph.js";
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
   * Get history for a specific record (LangGraph checkpoints when checkpointer is set).
   */
  getRecordHistory: protectedProcedure
    .input(getRecordHistorySchema)
    .query(async ({ ctx, input }) => {
      const fn = createGetRecordHistory(ctx.db, ctx.checkpointer);
      return fn(input);
    }),

  /**
   * Get checkpoint timeline for a record (debugging/audit). Requires checkpointer.
   */
  getRecordHistoryTimeline: protectedProcedure
    .input(getRecordHistoryTimelineSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.checkpointer) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "LangGraph checkpointer not configured"
        });
      }
      const fn = createGetRecordHistoryTimeline(ctx.checkpointer);
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
  }),

  // ===========================================================================
  // LangGraph: resume workflow, human review, pending reviews
  // ===========================================================================

  /**
   * Resume a paused workflow with external response (e.g. email reply).
   */
  resumeWorkflow: protectedProcedure
    .input(resumeWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx);
      const fn = createResumeWorkflow(
        ctx.db as Parameters<typeof createResumeWorkflow>[0],
        ctx.checkpointer,
        workspaceId
      );
      return fn(input);
    }),

  /**
   * Submit human review decision for a record.
   */
  submitHumanReview: protectedProcedure
    .input(submitHumanReviewSchema)
    .mutation(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx);
      const fn = createSubmitHumanReview(
        ctx.db as Parameters<typeof createSubmitHumanReview>[0],
        ctx.checkpointer,
        workspaceId
      );
      return fn(input);
    }),

  /**
   * List records pending human review (workflowStatus = WAITING_HUMAN).
   */
  listPendingReviews: protectedProcedure
    .input(listPendingReviewsSchema)
    .query(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx) ?? input.workspaceId;
      if (!workspaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "workspaceId required (from context or input)"
        });
      }
      const fn = createListPendingReviews(ctx.db);
      return fn({ workspaceId });
    })
});
