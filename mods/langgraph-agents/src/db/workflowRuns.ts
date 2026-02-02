/**
 * Copyright (C) 2026 by Outlast.
 *
 * CRUD functions for workflow_runs table.
 */
import type { Pool } from "pg";

export interface WorkflowRun {
  id: string;
  workspaceId: string;
  recordId: string;
  configName: string;
  threadId: string;
  status: string;
  initialData: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * Schedule a new LangGraph workflow run.
 */
export async function scheduleWorkflow(
  pool: Pool,
  workspaceId: string,
  recordId: string,
  configName: string,
  initialData?: Record<string, unknown>
): Promise<WorkflowRun> {
  const result = await pool.query(
    `INSERT INTO workflow_runs (workspace_id, record_id, config_name, initial_data)
     VALUES ($1, $2, $3, $4)
     RETURNING id, thread_id, config_name, status, created_at`,
    [workspaceId, recordId, configName, JSON.stringify(initialData ?? {})]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    workspaceId,
    recordId,
    configName: row.config_name,
    threadId: row.thread_id,
    status: row.status,
    initialData: initialData ?? {},
    errorMessage: null,
    createdAt: row.created_at?.toISOString() ?? null,
    startedAt: null,
    completedAt: null
  };
}

/**
 * Get pending workflow runs to execute.
 */
export async function getPendingWorkflows(
  pool: Pool,
  workspaceId?: string,
  limit: number = 10
): Promise<WorkflowRun[]> {
  let query: string;
  let params: unknown[];

  if (workspaceId) {
    query = `SELECT id, workspace_id, record_id, config_name, thread_id, initial_data
             FROM workflow_runs
             WHERE status = 'PENDING' AND workspace_id = $1
             ORDER BY created_at ASC
             LIMIT $2`;
    params = [workspaceId, limit];
  } else {
    query = `SELECT id, workspace_id, record_id, config_name, thread_id, initial_data
             FROM workflow_runs
             WHERE status = 'PENDING'
             ORDER BY created_at ASC
             LIMIT $1`;
    params = [limit];
  }

  const result = await pool.query(query, params);

  return result.rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    recordId: row.record_id,
    configName: row.config_name,
    threadId: row.thread_id,
    status: "PENDING",
    initialData: row.initial_data ? JSON.parse(row.initial_data) : {},
    errorMessage: null,
    createdAt: row.created_at?.toISOString() ?? null,
    startedAt: null,
    completedAt: null
  }));
}

/**
 * Update workflow run status.
 */
export async function updateWorkflowStatus(
  pool: Pool,
  workflowRunId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  await pool.query(
    `UPDATE workflow_runs
     SET status = $2,
         error_message = $3,
         started_at = CASE WHEN $2 = 'RUNNING' AND started_at IS NULL THEN NOW() ELSE started_at END,
         completed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN NOW() ELSE completed_at END
     WHERE id = $1`,
    [workflowRunId, status, errorMessage ?? null]
  );
}

/**
 * Get a specific workflow run by ID.
 */
export async function getWorkflowRun(
  pool: Pool,
  workflowRunId: string
): Promise<WorkflowRun | null> {
  const result = await pool.query(
    `SELECT id, workspace_id, record_id, config_name, thread_id, status,
            initial_data, error_message, created_at, started_at, completed_at
     FROM workflow_runs
     WHERE id = $1`,
    [workflowRunId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    recordId: row.record_id,
    configName: row.config_name,
    threadId: row.thread_id,
    status: row.status,
    initialData: row.initial_data ? JSON.parse(row.initial_data) : {},
    errorMessage: row.error_message,
    createdAt: row.created_at?.toISOString() ?? null,
    startedAt: row.started_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null
  };
}

/**
 * Get a workflow run by thread ID.
 */
export async function getWorkflowRunByThreadId(
  pool: Pool,
  threadId: string
): Promise<WorkflowRun | null> {
  const result = await pool.query(
    `SELECT id, workspace_id, record_id, config_name, thread_id, status,
            initial_data, error_message, created_at, started_at, completed_at
     FROM workflow_runs
     WHERE thread_id = $1`,
    [threadId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    recordId: row.record_id,
    configName: row.config_name,
    threadId: row.thread_id,
    status: row.status,
    initialData: row.initial_data ? JSON.parse(row.initial_data) : {},
    errorMessage: row.error_message,
    createdAt: row.created_at?.toISOString() ?? null,
    startedAt: row.started_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null
  };
}
