/**
 * Copyright (C) 2026 by Outlast.
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load .env from project root in development
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

assertEnvsAreSet(["OUTLAST_DATABASE_URL", "OUTLAST_IDENTITY_PUBLIC_KEY", "OUTLAST_OPENAI_API_KEY"]);

import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "./trpc/index.js";
import { assertEnvsAreSet, ValidationError } from "@outlast/common";
import {
  createWorkflowRunner,
  createCronScheduler,
  listRecordsForWorkflow,
  setupCheckpointer,
  type RecordStatus
} from "@outlast/agents";
import { logger } from "./logger.js";
import { createOwnerUser } from "./startup.js";
import { prisma } from "./db.js";
import { setCheckpointer } from "./checkpointer.js";
import { setGraphDeps } from "./graphDeps.js";
import { dummySendEmail, dummyInitiateCall } from "./services/dummy.js";
import {
  createGetWorkflowWithRules,
  createGetRecordWithContact,
  createUpdateRecordStatus,
  createListSchedulableWorkflows
} from "./api/runner/index.js";
import "./api/records/index.js";
import { webhooksRouter } from "./webhooks/index.js";

// Re-export AppRouter type for clients
export type { AppRouter } from "./trpc/index.js";

const app = express();
const PORT = process.env.OUTLAST_PORT || 3000;

// Enable CORS for dashboard and other clients
app.use(
  cors({
    origin: process.env.OUTLAST_CORS_ORIGIN || ["http://localhost:5173", "http://localhost:3001"],
    credentials: true
  })
);

app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// tRPC API
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);

// Webhooks (email reply, call transcription)
app.use("/webhooks", webhooksRouter);

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ValidationError) {
    logger.error("validation error", { error: err.message });
    res.status(400).json(err.toJSON());
    return;
  }

  logger.error("unhandled error", { error: err.message });
  res.status(500).json({ error: "Internal server error" });
});

// Start server
async function start() {
  // Create owner user if environment variables are set
  await createOwnerUser();

  // LangGraph checkpointer (optional: requires OUTLAST_DATABASE_URL)
  const databaseUrl = process.env.OUTLAST_DATABASE_URL;
  if (databaseUrl) {
    try {
      const cp = await setupCheckpointer(databaseUrl);
      setCheckpointer(cp);
      logger.info("LangGraph checkpointer ready");
    } catch (err) {
      logger.warn("LangGraph checkpointer not initialized", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Create runner API functions (dependency injection)
  const getWorkflowWithRules = createGetWorkflowWithRules(prisma);
  const getRecordWithContact = createGetRecordWithContact(prisma);
  const updateRecordStatus = createUpdateRecordStatus(prisma);
  const listSchedulableWorkflows = createListSchedulableWorkflows(prisma);

  // Create workflow runner (history is stored in LangGraph checkpoints, not separate table)
  const workflowRunnerDeps = {
    getWorkflow: (id: string) => getWorkflowWithRules({ id }),
    listRecordsForWorkflow: (wfId: string, statuses: RecordStatus[], batch: number) =>
      listRecordsForWorkflow(prisma, wfId, statuses, batch),
    getRecord: (id: string) => getRecordWithContact({ id }),
    // History is now stored in LangGraph checkpoints - these stubs are for interface compatibility
    getRecordHistory: async () => [],
    createRecordHistory: async () => ({ id: "" }),
    updateRecordStatus: (id: string, status: string) => updateRecordStatus({ id, status }),
    sendEmail: dummySendEmail,
    initiateCall: dummyInitiateCall,
    openaiApiKey: process.env.OUTLAST_OPENAI_API_KEY!
  };
  setGraphDeps(workflowRunnerDeps);

  const workflowRunner = createWorkflowRunner(workflowRunnerDeps);

  // Create and start cron scheduler
  const scheduler = createCronScheduler({
    listWorkflows: listSchedulableWorkflows,
    runWorkflow: (id) => workflowRunner.run(id),
    logger
  });

  await scheduler.start();

  app.listen(PORT, () => {
    logger.info("api server started", { port: PORT });
  });
}

start().catch((err) => {
  logger.error("failed to start server", { error: err.message });
  process.exit(1);
});
