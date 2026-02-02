/**
 * Copyright (C) 2026 by Outlast.
 *
 * LangGraph API: resume workflow, submit human review, list pending reviews.
 */
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { Command } from "@langchain/langgraph";
import {
  createProcurementGraph,
  createToolExecutor,
  createInvokeLLM,
  allTools,
  type WorkflowGraphConfig
} from "@outlast/agents";
import { getGraphDeps } from "../../graphDeps.js";
import {
  withErrorHandlingAndValidation,
  resumeWorkflowSchema,
  submitHumanReviewSchema,
  type ResumeWorkflowInput,
  type SubmitHumanReviewInput
} from "@outlast/common";
import type { DbClient } from "@outlast/common";
import { TRPCError } from "@trpc/server";
import { logger } from "../../logger.js";

/** Db client with recordWorkflow for resolving workflowId from record. */
type LangGraphDbClient = DbClient & {
  recordWorkflow?: {
    findFirst: (args: { where: { recordId: string } }) => Promise<{ workflowId: string } | null>;
  };
};

/**
 * Resolve workflow ID for a record: input.workflowId or first recordWorkflow.
 */
async function resolveWorkflowId(
  db: LangGraphDbClient,
  recordId: string,
  inputWorkflowId?: string
): Promise<string> {
  if (inputWorkflowId) return inputWorkflowId;
  const rw = db.recordWorkflow;
  if (rw) {
    const first = await rw.findFirst({ where: { recordId } });
    if (first) return first.workflowId;
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Record has no workflow; provide workflowId"
  });
}

/**
 * Build workflow config for graph from workflow entity.
 */
function toWorkflowGraphConfig(w: {
  id: string;
  name: string;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  tools: string[] | null;
}): WorkflowGraphConfig {
  return {
    id: w.id,
    name: w.name,
    model: w.model ?? "gpt-4o",
    systemPrompt: w.systemPrompt ?? null,
    temperature: w.temperature ?? 0.7,
    tools: w.tools ?? [
      "sendEmail",
      "sendCall",
      "getRecord",
      "getRecordHistory",
      "updateRecordStatus"
    ]
  };
}

/**
 * Create resumeWorkflow handler. Requires checkpointer and graph deps set at startup.
 */
export function createResumeWorkflow(
  db: LangGraphDbClient,
  checkpointer: BaseCheckpointSaver | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workspaceId: string
) {
  const fn = async (input: ResumeWorkflowInput): Promise<{ ok: boolean }> => {
    if (!checkpointer) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "LangGraph checkpointer not configured"
      });
    }
    const graphDeps = getGraphDeps();
    if (!graphDeps) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Graph runner deps not configured"
      });
    }

    const workflowId = await resolveWorkflowId(db, input.recordId, input.workflowId);
    const workflow = await graphDeps.getWorkflow(workflowId);
    if (!workflow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
    }

    const toolExecutor = createToolExecutor({
      getRecord: async (id) => {
        const r = await graphDeps.getRecord(id);
        return r
          ? {
              id: r.id,
              title: r.id,
              status: r.status,
              priority: r.priority,
              contact: r.contact
            }
          : null;
      },
      getRecordHistory: async (recordId, limit) => {
        const history = await graphDeps.getRecordHistory(recordId, limit);
        return history.map((h) => ({
          id: h.id,
          status: "OPEN",
          aiNote: h.aiNote ?? null,
          humanNote: null,
          agent: "workflow-runner",
          channel: h.channel,
          createdAt: h.createdAt
        }));
      },
      createRecordHistory: graphDeps.createRecordHistory,
      updateRecordStatus: graphDeps.updateRecordStatus,
      sendEmail: graphDeps.sendEmail,
      initiateCall: graphDeps.initiateCall
    });

    const invokeLLM = createInvokeLLM({
      apiKey: graphDeps.openaiApiKey,
      agent: {
        name: workflow.name,
        systemPrompt: workflow.systemPrompt ?? `You are an agent for ${workflow.name}.`,
        allowedTools: workflow.tools ?? [
          "sendEmail",
          "sendCall",
          "getRecord",
          "updateRecordStatus"
        ],
        model: workflow.model ?? "gpt-4o",
        temperature: workflow.temperature ?? 0.7
      },
      allTools,
      toolExecutor
    });

    const graph = createProcurementGraph(
      {
        workflow: toWorkflowGraphConfig(workflow),
        toolExecutor,
        invokeLLM: invokeLLM as (
          messages: { role: string; content: string }[],
          userContent: string,
          context?: Record<string, unknown>
        ) => Promise<string>
      },
      { checkpointer }
    );

    await graph.invoke(new Command({ resume: input.response }), {
      configurable: { thread_id: input.recordId }
    });

    logger.info("workflow resumed", { recordId: input.recordId, workflowId });
    return { ok: true };
  };

  return withErrorHandlingAndValidation(
    fn as (params: ResumeWorkflowInput) => Promise<{ ok: boolean }>,
    resumeWorkflowSchema
  );
}

/**
 * Create submitHumanReview handler.
 */
export function createSubmitHumanReview(
  db: LangGraphDbClient,
  checkpointer: BaseCheckpointSaver | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _workspaceId: string
) {
  const fn = async (input: SubmitHumanReviewInput): Promise<{ ok: boolean }> => {
    if (!checkpointer) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "LangGraph checkpointer not configured"
      });
    }
    const graphDeps = getGraphDeps();
    if (!graphDeps) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Graph runner deps not configured"
      });
    }

    const workflowId = await resolveWorkflowId(db, input.recordId, input.workflowId);
    const workflow = await graphDeps.getWorkflow(workflowId);
    if (!workflow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
    }

    const toolExecutor = createToolExecutor({
      getRecord: async (id) => {
        const r = await graphDeps.getRecord(id);
        return r
          ? {
              id: r.id,
              title: r.id,
              status: r.status,
              priority: r.priority,
              contact: r.contact
            }
          : null;
      },
      getRecordHistory: async (recordId, limit) => {
        const history = await graphDeps.getRecordHistory(recordId, limit);
        return history.map(
          (h: { id: string; channel: string; createdAt: Date; aiNote: string | null }) => ({
            id: h.id,
            status: "OPEN",
            aiNote: h.aiNote ?? null,
            humanNote: null,
            agent: "workflow-runner",
            channel: h.channel,
            createdAt: h.createdAt
          })
        );
      },
      createRecordHistory: graphDeps.createRecordHistory,
      updateRecordStatus: graphDeps.updateRecordStatus,
      sendEmail: graphDeps.sendEmail,
      initiateCall: graphDeps.initiateCall
    });

    const invokeLLMHuman = createInvokeLLM({
      apiKey: graphDeps.openaiApiKey,
      agent: {
        name: workflow.name,
        systemPrompt: workflow.systemPrompt ?? `You are an agent for ${workflow.name}.`,
        allowedTools: workflow.tools ?? [
          "sendEmail",
          "sendCall",
          "getRecord",
          "updateRecordStatus"
        ],
        model: workflow.model ?? "gpt-4o",
        temperature: workflow.temperature ?? 0.7
      },
      allTools,
      toolExecutor
    });

    const graph = createProcurementGraph(
      {
        workflow: toWorkflowGraphConfig(workflow),
        toolExecutor,
        invokeLLM: invokeLLMHuman as (
          messages: { role: string; content: string }[],
          userContent: string,
          context?: Record<string, unknown>
        ) => Promise<string>
      },
      { checkpointer }
    );

    const resumeValue = {
      approved: input.decision.approved,
      notes: input.decision.notes,
      nextAction: input.decision.nextAction
    };

    await graph.invoke(new Command({ resume: resumeValue }), {
      configurable: { thread_id: input.recordId }
    });

    logger.info("human review submitted", { recordId: input.recordId });
    return { ok: true };
  };

  return withErrorHandlingAndValidation(fn, submitHumanReviewSchema);
}

/**
 * Create listPendingReviews handler. Returns records with workflowStatus = WAITING_HUMAN.
 * Call with { workspaceId: string } (router supplies from context).
 */
export function createListPendingReviews(db: DbClient) {
  return async (input: { workspaceId: string }): Promise<unknown[]> => {
    const recordClient = db.record as {
      findMany: (args: {
        where: { workspaceId: string; workflowStatus?: string };
        orderBy?: { updatedAt: string };
      }) => Promise<unknown[]>;
    };
    const records = await recordClient.findMany({
      where: {
        workspaceId: input.workspaceId,
        workflowStatus: "WAITING_HUMAN"
      },
      orderBy: { updatedAt: "desc" }
    });
    return records;
  };
}
