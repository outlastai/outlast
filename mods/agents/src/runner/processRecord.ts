/**
 * Copyright (C) 2026 by Outlast.
 *
 * Process a single record through the workflow.
 */
import type { RecordWithHistory, RecordRunResult, WorkflowWithRules } from "./types.js";
import type { InvokeLLMFn } from "../llm/types.js";
import { staticPreCheck } from "../staticCheck/staticPreCheck.js";
import { buildAnalysisContext } from "../staticCheck/buildAnalysisContext.js";
import type { StaticRules } from "../staticCheck/types.js";
import { logger } from "../logger.js";

/**
 * Default rules if workflow has none.
 */
const DEFAULT_RULES: StaticRules = {
  minDaysBetweenActions: 3,
  maxActionAttempts: 5,
  recordTooRecentDays: 1,
  recentUpdateCooldownDays: 1,
  highPriorityMinDays: 1,
  lowPriorityMultiplier: 2,
  enabledStatuses: ["OPEN"],
  escalationThreshold: 3,
  batchSize: 50
};

/**
 * Process a single record through the workflow.
 * Performs static check, then invokes AI if needed.
 */
export async function processRecord(
  record: RecordWithHistory,
  workflow: WorkflowWithRules,
  invokeLLM: InvokeLLMFn
): Promise<RecordRunResult> {
  const rules = workflow.schedulerRules || DEFAULT_RULES;

  logger.verbose("processing record", {
    recordId: record.id,
    status: record.status,
    priority: record.priority,
    historyCount: record.history.length,
    hasContact: !!record.contact
  });

  // Build analysis context
  const context = buildAnalysisContext(
    {
      id: record.id,
      status: record.status,
      priority: record.priority,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    },
    record.history.map((h) => ({ channel: h.channel, createdAt: h.createdAt }))
  );

  logger.verbose("analysis context built", {
    recordId: record.id,
    actionCount: context.actionCount,
    daysSinceLastAction: context.daysSinceLastAction,
    daysSinceLastUpdate: context.daysSinceLastUpdate,
    daysSinceCreation: context.daysSinceCreation
  });

  // Static pre-check
  const preCheck = staticPreCheck(context, rules);

  logger.verbose("static pre-check result", {
    recordId: record.id,
    shouldProceed: preCheck.shouldProceed,
    reason: preCheck.reason
  });

  if (!preCheck.shouldProceed) {
    return {
      recordId: record.id,
      outcome: "skipped_static",
      reason: preCheck.reason
    };
  }

  // Build context for AI
  const recordSummary = buildRecordSummary(record);

  logger.verbose("invoking AI for record", { recordId: record.id });

  try {
    // Invoke AI
    const response = await invokeLLM([], recordSummary);

    logger.verbose("AI response received", {
      recordId: record.id,
      responseLength: response.length,
      responsePreview: response.substring(0, 200)
    });

    // Check if any action was taken (tools would have been called)
    // The tools themselves create RecordHistory entries
    const actionTaken =
      response.toLowerCase().includes("sent") || response.toLowerCase().includes("call");

    logger.verbose("record processing complete", {
      recordId: record.id,
      outcome: actionTaken ? "action_taken" : "skipped_ai",
      actionTaken
    });

    return {
      recordId: record.id,
      outcome: actionTaken ? "action_taken" : "skipped_ai",
      reason: actionTaken ? undefined : "AI decided no action needed"
    };
  } catch (error) {
    logger.verbose("error processing record", {
      recordId: record.id,
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      recordId: record.id,
      outcome: "error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Build a summary of the record for the AI.
 */
function buildRecordSummary(record: RecordWithHistory): string {
  const lines = [
    `Record ID: ${record.id}`,
    `Status: ${record.status}`,
    `Priority: ${record.priority || "MEDIUM"}`,
    `Created: ${record.createdAt.toISOString()}`,
    `Updated: ${record.updatedAt.toISOString()}`
  ];

  if (record.contact) {
    lines.push(
      "",
      "Contact:",
      `  Name: ${record.contact.name}`,
      `  Email: ${record.contact.email || "N/A"}`,
      `  Phone: ${record.contact.phone || "N/A"}`,
      `  Preferred: ${record.contact.preferredChannel}`
    );
  }

  if (record.history.length > 0) {
    lines.push("", "Recent History:");
    for (const h of record.history.slice(0, 5)) {
      lines.push(`  - ${h.createdAt.toISOString()} [${h.channel}]: ${h.aiNote || "No note"}`);
    }
  }

  lines.push("", "Please analyze this record and decide if follow-up is needed.");

  return lines.join("\n");
}
