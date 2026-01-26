/**
 * Copyright (C) 2026 by Outlast.
 *
 * Create workflow runner factory.
 */
import type { WorkflowRunnerDependencies, WorkflowRunResult, RecordRunResult } from "./types.js";
import { processRecord } from "./processRecord.js";
import { createInvokeLLM } from "../llm/createInvokeLLM.js";
import { createToolExecutor } from "../tools/executor/index.js";
import { allTools } from "../tools/definitions/index.js";

/**
 * Create a workflow runner with the given dependencies.
 */
export function createWorkflowRunner(deps: WorkflowRunnerDependencies) {
  return {
    /**
     * Run a workflow by ID.
     */
    async run(workflowId: string): Promise<WorkflowRunResult> {
      // Get workflow
      const workflow = await deps.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Get enabled statuses from rules
      const enabledStatuses = workflow.schedulerRules?.enabledStatuses || ["OPEN"];
      const batchSize = workflow.schedulerRules?.batchSize || 50;

      // List records
      const records = await deps.listRecordsForWorkflow(workflowId, enabledStatuses, batchSize);

      // Create tool executor
      const toolExecutor = createToolExecutor({
        getRecord: async (id) => {
          const r = await deps.getRecord(id);
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
          const history = await deps.getRecordHistory(recordId, limit);
          return history.map((h) => ({
            id: h.id,
            status: "OPEN", // Default status for history entries
            aiNote: h.aiNote,
            humanNote: null,
            agent: "workflow-runner",
            channel: h.channel,
            createdAt: h.createdAt
          }));
        },
        createRecordHistory: deps.createRecordHistory,
        updateRecordStatus: deps.updateRecordStatus,
        sendEmail: deps.sendEmail,
        initiateCall: deps.initiateCall
      });

      // Create LLM invoker
      const invokeLLM = createInvokeLLM({
        apiKey: deps.openaiApiKey,
        agent: {
          name: workflow.name,
          systemPrompt: workflow.systemPrompt || buildDefaultPrompt(workflow.name),
          allowedTools: workflow.tools || [
            "sendEmail",
            "sendCall",
            "getRecord",
            "updateRecordStatus"
          ],
          model: workflow.model || "gpt-4o",
          temperature: workflow.temperature ?? 0.7
        },
        allTools,
        toolExecutor
      });

      // Process records
      const results: RecordRunResult[] = [];
      for (const record of records) {
        const result = await processRecord(record, workflow, invokeLLM);
        results.push(result);
      }

      // Aggregate results
      return {
        workflowId,
        workflowName: workflow.name,
        processed: results.length,
        actionsTaken: results.filter((r) => r.outcome === "action_taken").length,
        skippedByStaticCheck: results.filter((r) => r.outcome === "skipped_static").length,
        skippedByAI: results.filter((r) => r.outcome === "skipped_ai").length,
        errors: results.filter((r) => r.outcome === "error").length,
        details: results
      };
    }
  };
}

/**
 * Build default system prompt for a workflow.
 */
function buildDefaultPrompt(workflowName: string): string {
  return `You are an AI agent for the "${workflowName}" workflow in OutLast.

Your role is to analyze records and decide if follow-up is needed.

Guidelines:
- Check the record status, priority, and history
- Consider the contact's preferred communication channel
- Send follow-up only if appropriate and enough time has passed
- Use sendEmail for email contacts, sendCall for phone contacts
- If no action is needed, simply respond with your analysis

Available tools: sendEmail, sendCall, getRecord, updateRecordStatus`;
}
