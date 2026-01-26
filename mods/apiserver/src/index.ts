/**
 * Copyright (C) 2026 by Outlast. MIT License.
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
import { createWorkflowRunner, createCronScheduler, listRecordsForWorkflow } from "@outlast/agents";
import { logger } from "./logger.js";
import { createOwnerUser } from "./startup.js";
import { prisma } from "./db.js";
import { dummySendEmail, dummyInitiateCall } from "./services/dummy.js";
import {
  createGetWorkflowWithRules,
  createGetRecordWithContact,
  createGetRecordHistory,
  createCreateRecordHistory,
  createUpdateRecordStatus,
  createListSchedulableWorkflows
} from "./api/runner/index.js";

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

  // Create runner API functions (dependency injection)
  const getWorkflowWithRules = createGetWorkflowWithRules(prisma);
  const getRecordWithContact = createGetRecordWithContact(prisma);
  const getRecordHistory = createGetRecordHistory(prisma);
  const createRecordHistory = createCreateRecordHistory(prisma);
  const updateRecordStatus = createUpdateRecordStatus(prisma);
  const listSchedulableWorkflows = createListSchedulableWorkflows(prisma);

  // Create workflow runner
  const workflowRunner = createWorkflowRunner({
    getWorkflow: (id) => getWorkflowWithRules({ id }),
    listRecordsForWorkflow: (wfId, statuses, batch) =>
      listRecordsForWorkflow(prisma, wfId, statuses, batch),
    getRecord: (id) => getRecordWithContact({ id }),
    getRecordHistory: (recordId, limit) => getRecordHistory({ recordId, limit }),
    createRecordHistory: (data) => createRecordHistory(data),
    updateRecordStatus: (id, status) => updateRecordStatus({ id, status }),
    sendEmail: dummySendEmail,
    initiateCall: dummyInitiateCall,
    openaiApiKey: process.env.OUTLAST_OPENAI_API_KEY!
  });

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
