/**
 * Copyright (C) 2026 by Outlast.
 *
 * Functions for managing callRef <-> thread_id mappings.
 */
import type { Pool } from "pg";

export interface CallRefMapping {
  callRef: string;
  threadId: string;
  workflowRunId: string;
  createdAt: string;
}

/**
 * Store callRef -> thread_id mapping when call is initiated.
 */
export async function storeCallRefMapping(
  pool: Pool,
  callRef: string,
  threadId: string,
  workflowRunId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO call_ref_mapping (call_ref, thread_id, workflow_run_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (call_ref) DO UPDATE
     SET thread_id = EXCLUDED.thread_id,
         workflow_run_id = EXCLUDED.workflow_run_id`,
    [callRef, threadId, workflowRunId]
  );
}

/**
 * Lookup thread_id when Fonoster webhook arrives.
 */
export async function getThreadIdByCallRef(pool: Pool, callRef: string): Promise<string | null> {
  const result = await pool.query(`SELECT thread_id FROM call_ref_mapping WHERE call_ref = $1`, [
    callRef
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].thread_id;
}

/**
 * Get full call ref mapping details.
 */
export async function getCallRefMapping(
  pool: Pool,
  callRef: string
): Promise<CallRefMapping | null> {
  const result = await pool.query(
    `SELECT call_ref, thread_id, workflow_run_id, created_at
     FROM call_ref_mapping
     WHERE call_ref = $1`,
    [callRef]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    callRef: row.call_ref,
    threadId: row.thread_id,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at?.toISOString() ?? null
  };
}

/**
 * Get mapping by thread_id.
 */
export async function getMappingByThreadId(
  pool: Pool,
  threadId: string
): Promise<CallRefMapping | null> {
  const result = await pool.query(
    `SELECT call_ref, thread_id, workflow_run_id, created_at
     FROM call_ref_mapping
     WHERE thread_id = $1`,
    [threadId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    callRef: row.call_ref,
    threadId: row.thread_id,
    workflowRunId: row.workflow_run_id,
    createdAt: row.created_at?.toISOString() ?? null
  };
}

/**
 * Delete a call ref mapping.
 */
export async function deleteCallRefMapping(pool: Pool, callRef: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM call_ref_mapping WHERE call_ref = $1`, [callRef]);

  return (result.rowCount ?? 0) > 0;
}
