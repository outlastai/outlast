/**
 * Copyright (C) 2026 by Outlast.
 *
 * Workflow Runner
 * Polls the workflow_runs table for pending workflows and executes them.
 */
import { Pool } from "pg";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { buildAndCompileGraph } from "./builder.js";
import { createInitialState } from "./state.js";
import {
  getPendingWorkflows,
  updateWorkflowStatus,
  getWorkflowRun,
  type WorkflowRun
} from "./db/index.js";
import { storeCallRefMapping } from "./db/index.js";

// Import nodes and routers to trigger registration
import "./nodes/index.js";
import "./routers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/outlast";
const CONFIGS_DIR = join(__dirname, "..", "src", "configs");
const POLL_INTERVAL = parseInt(process.env.RUNNER_POLL_INTERVAL ?? "5", 10) * 1000;
const BATCH_SIZE = parseInt(process.env.RUNNER_BATCH_SIZE ?? "10", 10);

/**
 * Logger utility.
 */
function log(level: string, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...meta }));
}

/**
 * Execute a single workflow run.
 */
async function runWorkflow(
  pool: Pool,
  checkpointer: PostgresSaver,
  workflowRun: WorkflowRun
): Promise<void> {
  const { id: runId, configName, threadId, recordId, initialData, workspaceId } = workflowRun;

  log("info", `Starting workflow run ${runId}`, { configName, threadId });

  try {
    // Mark as running
    await updateWorkflowStatus(pool, runId, "RUNNING");

    // Load config and build graph
    const configPath = join(CONFIGS_DIR, `${configName}.yaml`);
    const workflow = buildAndCompileGraph(configPath, checkpointer);

    // Prepare initial state
    const initialState = createInitialState(recordId, runId, workspaceId, initialData);

    // Run workflow (will pause at interrupt points)
    const config = { configurable: { thread_id: threadId } };
    const result = await workflow.invoke(initialState, config);

    // Check if workflow was interrupted (has callRef but pending status)
    const callRef = result.callRef as string | null;
    const callStatus = result.callStatus as string | null;

    if (callRef && callStatus === "pending") {
      // Workflow interrupted - waiting for Fonoster callback
      await storeCallRefMapping(pool, callRef, threadId, runId);
      await updateWorkflowStatus(pool, runId, "INTERRUPTED");
      log("info", `Workflow ${runId} interrupted`, { callRef });
    } else {
      // Workflow completed
      await updateWorkflowStatus(pool, runId, "COMPLETED");
      log("info", `Workflow ${runId} completed`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", `Workflow ${runId} failed`, { error: message });
    await updateWorkflowStatus(pool, runId, "FAILED", message);
  }
}

/**
 * Main polling loop.
 */
async function pollAndRun(pool: Pool, checkpointer: PostgresSaver): Promise<void> {
  log("info", `Starting workflow runner`, { pollInterval: POLL_INTERVAL, batchSize: BATCH_SIZE });

  while (true) {
    try {
      // Fetch pending workflows
      const pending = await getPendingWorkflows(pool, undefined, BATCH_SIZE);

      if (pending.length > 0) {
        log("info", `Found ${pending.length} pending workflow(s)`);

        for (const run of pending) {
          await runWorkflow(pool, checkpointer, run);
        }
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("error", `Error in poll loop`, { error: message });
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

/**
 * Run a single workflow by ID (for testing/debugging).
 */
export async function runSingleWorkflow(workflowRunId: string): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const checkpointer = PostgresSaver.fromConnString(DATABASE_URL);
  await checkpointer.setup();

  try {
    const workflowRun = await getWorkflowRun(pool, workflowRunId);
    if (!workflowRun) {
      log("error", `Workflow run not found: ${workflowRunId}`);
      return;
    }

    await runWorkflow(pool, checkpointer, workflowRun);
  } finally {
    await pool.end();
  }
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  log("info", "Initializing workflow runner...");

  // Create database pool
  const pool = new Pool({ connectionString: DATABASE_URL });
  log("info", "Database connection established");

  // Create checkpointer
  const checkpointer = PostgresSaver.fromConnString(DATABASE_URL);
  await checkpointer.setup();
  log("info", "Checkpointer initialized");

  try {
    await pollAndRun(pool, checkpointer);
  } finally {
    await pool.end();
    log("info", "Database connection closed");
  }
}

// Run if this is the main module
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
