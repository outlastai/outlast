/**
 * Copyright (C) 2026 by Outlast.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

/**
 * Dev mode flag - set OUTLAST_DEV_MODE=true to bypass authentication.
 * WARNING: Only use in development/testing environments!
 */
const DEV_MODE = process.env.OUTLAST_DEV_MODE === "true";

/**
 * Initialize tRPC with context type.
 */
const t = initTRPC.context<Context>().create();

/**
 * Router factory for creating tRPC routers.
 */
export const router = t.router;

/**
 * Public procedure - no authentication required.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires a verified JWT.
 * Throws UNAUTHORIZED error if not authenticated.
 * In DEV_MODE, authentication is bypassed (requires x-access-key-id header still).
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (DEV_MODE) {
    // In dev mode, only require the workspace ID header
    if (!ctx.accessKeyId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "x-access-key-id header is required even in dev mode"
      });
    }
    return next();
  }

  if (!ctx.isAuthenticated) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});
