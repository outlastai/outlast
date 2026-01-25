/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load .env from project root in development
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

assertEnvsAreSet(["OUTLAST_DATABASE_URL", "OUTLAST_IDENTITY_PUBLIC_KEY"]);

import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext } from "./trpc/index.js";
import { assertEnvsAreSet, ValidationError } from "@outlast/common";
import { logger } from "./logger.js";
import { createOwnerUser } from "./startup.js";

// Re-export AppRouter type for clients
export type { AppRouter } from "./trpc/index.js";

const app = express();
const PORT = process.env.OUTLAST_PORT || 3000;

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

  app.listen(PORT, () => {
    logger.info("api server started", { port: PORT });
  });
}

start().catch((err) => {
  logger.error("failed to start server", { error: err.message });
  process.exit(1);
});
