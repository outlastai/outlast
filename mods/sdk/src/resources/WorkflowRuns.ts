/**
 * Copyright (C) 2026 by Outlast.
 *
 * WorkflowRuns resource for scheduling and managing LangGraph workflow executions.
 */
import type { Client } from "../Client.js";

/**
 * Request to schedule a new workflow run.
 */
export interface ScheduleWorkflowRunRequest {
  /** UUID of the record to process */
  recordId: string;
  /** Name of the workflow config (e.g., "emailRouter", "phoneFollowup") */
  configName: string;
  /** Initial data for the workflow */
  initialData?: Record<string, unknown>;
}

/**
 * Request to get a specific workflow run.
 */
export interface GetWorkflowRunRequest {
  /** UUID of the workflow run */
  id: string;
}

/**
 * Request to list workflow runs.
 */
export interface ListWorkflowRunsRequest {
  /** Optional filter by record ID */
  recordId?: string;
  /** Optional filter by status */
  status?: WorkflowRunStatus;
  /** Maximum number of results (default: 50) */
  limit?: number;
  /** Number of results to skip (default: 0) */
  offset?: number;
}

/**
 * Workflow run status.
 */
export type WorkflowRunStatus = "PENDING" | "RUNNING" | "INTERRUPTED" | "COMPLETED" | "FAILED";

/**
 * A workflow run entity.
 */
export interface WorkflowRun {
  /** Unique identifier */
  id: string;
  /** Workspace ID */
  workspaceId: string;
  /** Record ID being processed */
  recordId: string;
  /** Name of the workflow config */
  configName: string;
  /** LangGraph thread ID */
  threadId: string;
  /** Current status */
  status: WorkflowRunStatus;
  /** Initial data passed to the workflow */
  initialData?: Record<string, unknown>;
  /** Error message if failed */
  errorMessage?: string;
  /** When the run was created */
  createdAt: string;
  /** When the run started executing */
  startedAt?: string;
  /** When the run completed */
  completedAt?: string;
}

/**
 * @classdesc Outlast WorkflowRuns, part of the Outlast API subsystem,
 * allows you to schedule and manage LangGraph workflow executions.
 * Note that an active Outlast deployment is required.
 *
 * @example
 *
 * const SDK = require("@outlast/sdk");
 *
 * async function main() {
 *   const apiKey = "your-api-key";
 *   const apiSecret = "your-api-secret";
 *   const workspaceAccessKeyId = "WO00000000000000000000000000000000";
 *
 *   try {
 *     const client = new SDK.Client({ workspaceAccessKeyId });
 *     await client.loginWithApiKey(apiKey, apiSecret);
 *
 *     const workflowRuns = new SDK.WorkflowRuns(client);
 *
 *     // Schedule a workflow run
 *     const run = await workflowRuns.scheduleWorkflowRun({
 *       recordId: "record-uuid",
 *       configName: "emailRouter",
 *       initialData: {
 *         phoneNumber: "+15551234567",
 *         contactEmail: "customer@example.com",
 *       },
 *     });
 *
 *     console.log(`Scheduled: ${run.id}, thread: ${run.threadId}`);
 *   } catch (e) {
 *     console.error(e);
 *   }
 * }
 *
 * main();
 */
class WorkflowRuns {
  private readonly client: Client;

  /**
   * Constructs a new WorkflowRuns object.
   *
   * @param {Client} client - Client object with underlying implementations to make requests to Outlast's API
   * @see Client
   */
  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Schedules a new LangGraph workflow run.
   *
   * @param {ScheduleWorkflowRunRequest} request - The request object containing workflow parameters
   * @param {string} request.recordId - The UUID of the record to process
   * @param {string} request.configName - The name of the workflow config
   * @param {Record<string, unknown>} [request.initialData] - Initial data for the workflow
   * @return {Promise<WorkflowRun>} - The created workflow run
   * @example
   * const workflowRuns = new SDK.WorkflowRuns(client);
   *
   * const run = await workflowRuns.scheduleWorkflowRun({
   *   recordId: "record-uuid",
   *   configName: "emailRouter",
   *   initialData: {
   *     phoneNumber: "+15551234567",
   *     contactEmail: "customer@example.com",
   *   },
   * });
   *
   * console.log(`Scheduled: ${run.id}, status: ${run.status}`);
   */
  async scheduleWorkflowRun(request: ScheduleWorkflowRunRequest): Promise<WorkflowRun> {
    return this.client.request((trpc) =>
      trpc.scheduleWorkflowRun.mutate(request)
    ) as Promise<WorkflowRun>;
  }

  /**
   * Gets a workflow run by ID.
   *
   * @param {GetWorkflowRunRequest} request - The request object containing the workflow run ID
   * @param {string} request.id - The UUID of the workflow run
   * @return {Promise<WorkflowRun>} - The workflow run details
   * @example
   * const workflowRuns = new SDK.WorkflowRuns(client);
   *
   * const run = await workflowRuns.getWorkflowRun({ id: "workflow-run-uuid" });
   * console.log(`Status: ${run.status}`);
   */
  async getWorkflowRun(request: GetWorkflowRunRequest): Promise<WorkflowRun> {
    return this.client.request((trpc) =>
      trpc.getWorkflowRun.query(request)
    ) as Promise<WorkflowRun>;
  }

  /**
   * Lists workflow runs with optional filtering.
   *
   * @param {ListWorkflowRunsRequest} [request={}] - Optional request object for filtering and pagination
   * @param {string} [request.recordId] - Filter by record ID
   * @param {WorkflowRunStatus} [request.status] - Filter by status
   * @param {number} [request.limit] - Maximum number of results
   * @param {number} [request.offset] - Number of results to skip
   * @return {Promise<WorkflowRun[]>} - Array of workflow runs
   * @example
   * const workflowRuns = new SDK.WorkflowRuns(client);
   *
   * // List all workflow runs
   * const allRuns = await workflowRuns.listWorkflowRuns();
   *
   * // List by record
   * const recordRuns = await workflowRuns.listWorkflowRuns({
   *   recordId: "record-uuid",
   * });
   *
   * // List pending runs
   * const pendingRuns = await workflowRuns.listWorkflowRuns({
   *   status: "PENDING",
   * });
   */
  async listWorkflowRuns(request: ListWorkflowRunsRequest = {}): Promise<WorkflowRun[]> {
    return this.client.request((trpc) => trpc.listWorkflowRuns.query(request)) as Promise<
      WorkflowRun[]
    >;
  }
}

export { WorkflowRuns };
