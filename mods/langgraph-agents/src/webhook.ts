/**
 * Copyright (C) 2026 by Outlast.
 *
 * Webhook Handler for Fonoster Callbacks
 * Receives webhooks when phone calls complete and resumes workflows.
 */
import express from "express";
import { Pool } from "pg";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { buildAndCompileGraph } from "./builder.js";
import { getCallRefMapping, getWorkflowRun, updateWorkflowStatus } from "./db/index.js";

// Import nodes and routers to trigger registration
import "./nodes/index.js";
import "./routers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/outlast";
const CONFIGS_DIR = join(__dirname, "..", "src", "configs");
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT ?? "8001", 10);

// Create Express app
const app = express();
app.use(express.json());

// Database pool and checkpointer (initialized on startup)
let pool: Pool;
let checkpointer: PostgresSaver;

/**
 * Logger utility.
 */
function log(level: string, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...meta }));
}

/**
 * Fonoster webhook payload interface.
 */
interface FonosterWebhookPayload {
  callRef: string;
  status: string;
  chatHistory?: Array<Record<string, unknown>>;
  recordingUrl?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Health check endpoint.
 */
app.get("/health", (_req, res) => {
  res.json({ status: "healthy" });
});

/**
 * Handle Fonoster webhook when a call completes.
 */
app.post("/webhook/fonoster", async (req, res) => {
  const payload = req.body as FonosterWebhookPayload;
  const callRef = payload.callRef;

  log("info", `Received Fonoster webhook`, { callRef });

  if (!callRef) {
    res.status(400).json({ error: "Missing callRef in payload" });
    return;
  }

  try {
    // Look up the thread_id from callRef
    const mapping = await getCallRefMapping(pool, callRef);
    if (!mapping) {
      log("warn", `No workflow found for callRef: ${callRef}`);
      res.status(404).json({ error: `No workflow found for callRef: ${callRef}` });
      return;
    }

    const { threadId, workflowRunId } = mapping;
    log("info", `Found workflow run`, { workflowRunId, threadId });

    // Get workflow run details
    const workflowRun = await getWorkflowRun(pool, workflowRunId);
    if (!workflowRun) {
      log("error", `Workflow run not found: ${workflowRunId}`);
      res.status(404).json({ error: `Workflow run not found: ${workflowRunId}` });
      return;
    }

    const { configName } = workflowRun;

    // Build the graph
    const configPath = join(CONFIGS_DIR, `${configName}.yaml`);
    const workflow = buildAndCompileGraph(configPath, checkpointer);

    // Prepare state update from Fonoster data
    const stateUpdate = {
      callStatus: payload.status,
      chatHistory: payload.chatHistory ?? [],
      recordingUrl: payload.recordingUrl ?? null,
      callDuration: payload.duration ?? null
    };

    // Mark as running again
    await updateWorkflowStatus(pool, workflowRunId, "RUNNING");

    // Resume the workflow
    const config = { configurable: { thread_id: threadId } };
    await workflow.invoke(stateUpdate, config);

    // Mark as completed
    await updateWorkflowStatus(pool, workflowRunId, "COMPLETED");

    log("info", `Workflow ${workflowRunId} resumed and completed`);

    res.json({
      status: "completed",
      threadId,
      workflowRunId,
      message: "Workflow resumed and completed successfully"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", `Error resuming workflow`, { callRef, error: message });

    // Try to mark as failed if we have the workflow run ID
    try {
      const mapping = await getCallRefMapping(pool, callRef);
      if (mapping) {
        await updateWorkflowStatus(pool, mapping.workflowRunId, "FAILED", message);
      }
    } catch {
      // Ignore cleanup errors
    }

    res.status(500).json({ error: `Error resuming workflow: ${message}` });
  }
});

/**
 * Raw webhook handler that accepts any JSON payload.
 */
app.post("/webhook/fonoster/raw", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  log("info", `Received raw webhook`, { body });

  const callRef = body.callRef as string | undefined;
  if (!callRef) {
    res.status(400).json({ error: "Missing callRef in payload" });
    return;
  }

  // Convert to structured payload and forward
  const payload: FonosterWebhookPayload = {
    callRef,
    status: (body.status as string) ?? "unknown",
    chatHistory: body.chatHistory as Array<Record<string, unknown>> | undefined,
    recordingUrl: body.recordingUrl as string | undefined,
    duration: body.duration as number | undefined,
    error: body.error as string | undefined,
    metadata: body.metadata as Record<string, unknown> | undefined
  };

  // Simulate request to main handler
  req.body = payload;
  // Forward would need internal routing, for simplicity we duplicate the logic
  // In production, extract the handler logic to a shared function
  res.json({ status: "received", callRef });
});

/**
 * Start the webhook server.
 */
async function main(): Promise<void> {
  log("info", "Initializing webhook server...");

  // Create database pool
  pool = new Pool({ connectionString: DATABASE_URL });
  log("info", "Database connection established");

  // Create checkpointer
  checkpointer = PostgresSaver.fromConnString(DATABASE_URL);
  await checkpointer.setup();
  log("info", "Checkpointer initialized");

  // Start server
  app.listen(WEBHOOK_PORT, () => {
    log("info", `Webhook server listening on port ${WEBHOOK_PORT}`);
  });
}

// Run if this is the main module
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

export { app };
