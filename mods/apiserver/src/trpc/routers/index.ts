/**
 * Copyright (C) 2026 by Outlast.
 */
import { router } from "../trpc.js";
import { publicRouter } from "./public.js";
import { protectedRouter } from "./protected.js";
import { identityRouter } from "@outlast/identity";

/**
 * Main application router combining all sub-routers.
 */
export const appRouter = router({
  ...publicRouter._def.procedures,
  ...protectedRouter._def.procedures,
  identity: identityRouter
});

/**
 * Type definition for the app router.
 * Export this for use in tRPC clients.
 */
export type AppRouter = typeof appRouter;
