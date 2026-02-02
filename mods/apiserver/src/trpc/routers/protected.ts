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
import { z } from "zod";
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
  }),

  // ===========================================================================
  // Workflow Runs (LangGraph)
  // ===========================================================================

  /**
   * Schedule a new LangGraph workflow run.
   */
  scheduleWorkflowRun: protectedProcedure
    .input(
      z.object({
        recordId: z.string().uuid(),
        configName: z.string().min(1),
        initialData: z.record(z.string(), z.unknown()).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx);

      // Verify the record exists and belongs to this workspace
      const record = await ctx.db.record.findFirst({
        where: {
          id: input.recordId,
          workspaceId
        }
      });

      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Record not found: ${input.recordId}`
        });
      }

      // Create the workflow run
      const workflowRun = await ctx.db.workflowRun.create({
        data: {
          workspaceId,
          recordId: input.recordId,
          configName: input.configName,
          initialData: input.initialData ?? {}
        }
      });

      return {
        id: workflowRun.id,
        workspaceId: workflowRun.workspaceId,
        recordId: workflowRun.recordId,
        configName: workflowRun.configName,
        threadId: workflowRun.threadId,
        status: workflowRun.status,
        createdAt: workflowRun.createdAt.toISOString()
      };
    }),

  /**
   * Get a workflow run by ID.
   */
  getWorkflowRun: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid()
      })
    )
    .query(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx);

      const workflowRun = await ctx.db.workflowRun.findFirst({
        where: {
          id: input.id,
          workspaceId
        }
      });

      if (!workflowRun) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Workflow run not found: ${input.id}`
        });
      }

      return {
        id: workflowRun.id,
        workspaceId: workflowRun.workspaceId,
        recordId: workflowRun.recordId,
        configName: workflowRun.configName,
        threadId: workflowRun.threadId,
        status: workflowRun.status,
        initialData: workflowRun.initialData,
        errorMessage: workflowRun.errorMessage,
        createdAt: workflowRun.createdAt.toISOString(),
        startedAt: workflowRun.startedAt?.toISOString(),
        completedAt: workflowRun.completedAt?.toISOString()
      };
    }),

  /**
   * List workflow runs with optional filtering.
   */
  listWorkflowRuns: protectedProcedure
    .input(
      z.object({
        recordId: z.string().uuid().optional(),
        status: z.enum(["PENDING", "RUNNING", "INTERRUPTED", "COMPLETED", "FAILED"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0)
      })
    )
    .query(async ({ ctx, input }) => {
      const workspaceId = getWorkspaceId(ctx);

      const where: Record<string, unknown> = { workspaceId };
      if (input.recordId) {
        where.recordId = input.recordId;
      }
      if (input.status) {
        where.status = input.status;
      }

      const workflowRuns = await ctx.db.workflowRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset
      });

      return workflowRuns.map(
        (run: {
          id: string;
          workspaceId: string;
          recordId: string;
          configName: string;
          threadId: string;
          status: string;
          initialData: unknown;
          errorMessage: string | null;
          createdAt: Date;
          startedAt: Date | null;
          completedAt: Date | null;
        }) => ({
          id: run.id,
          workspaceId: run.workspaceId,
          recordId: run.recordId,
          configName: run.configName,
          threadId: run.threadId,
          status: run.status,
          initialData: run.initialData,
          errorMessage: run.errorMessage,
          createdAt: run.createdAt.toISOString(),
          startedAt: run.startedAt?.toISOString(),
          completedAt: run.completedAt?.toISOString()
        })
      );
    })
});
