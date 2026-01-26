/**
 * Copyright (C) 2026 by Outlast.
 *
 * Types for workflow runner.
 */
import type { StaticRules, RecordStatus } from "../staticCheck/types.js";

/**
 * Workflow with scheduler rules.
 */
export interface WorkflowWithRules {
  id: string;
  name: string;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  tools: string[] | null;
  schedule: string | null;
  schedulerRules: StaticRules | null;
}

/**
 * Record with history for processing.
 */
export interface RecordWithHistory {
  id: string;
  status: RecordStatus;
  priority: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    preferredChannel: string;
  } | null;
  history: Array<{
    id: string;
    channel: string;
    createdAt: Date;
    aiNote: string | null;
  }>;
}

/**
 * Result from processing a single record.
 */
export interface RecordRunResult {
  recordId: string;
  outcome: "skipped_static" | "skipped_ai" | "action_taken" | "error";
  reason?: string;
  error?: string;
}

/**
 * Result from running a workflow.
 */
export interface WorkflowRunResult {
  workflowId: string;
  workflowName: string;
  processed: number;
  actionsTaken: number;
  skippedByStaticCheck: number;
  skippedByAI: number;
  errors: number;
  details: RecordRunResult[];
}

/**
 * Dependencies for the workflow runner.
 */
export interface WorkflowRunnerDependencies {
  /** Get workflow with scheduler rules */
  getWorkflow: (workflowId: string) => Promise<WorkflowWithRules | null>;

  /** List records for workflow */
  listRecordsForWorkflow: (
    workflowId: string,
    enabledStatuses: RecordStatus[],
    batchSize: number
  ) => Promise<RecordWithHistory[]>;

  /** Get record with contact */
  getRecord: (recordId: string) => Promise<RecordWithHistory | null>;

  /** Get record history */
  getRecordHistory: (recordId: string, limit?: number) => Promise<RecordWithHistory["history"]>;

  /** Create record history */
  createRecordHistory: (data: {
    recordId: string;
    status: string;
    aiNote?: string;
    agent: string;
    channel: string;
    channelMetadata?: Record<string, unknown>;
  }) => Promise<{ id: string }>;

  /** Update record status */
  updateRecordStatus: (recordId: string, status: string) => Promise<{ id: string }>;

  /** Send email */
  sendEmail: (params: {
    to: string;
    subject: string;
    body: string;
  }) => Promise<{ messageId: string }>;

  /** Initiate call */
  initiateCall: (params: { phone: string; talkingPoints: string }) => Promise<{ callId: string }>;

  /** OpenAI API key */
  openaiApiKey: string;
}
