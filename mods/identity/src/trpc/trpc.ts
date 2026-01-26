/**
 * Copyright (C) 2026 by Outlast.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import type { IdentityContext } from "./context.js";

const t = initTRPC.context<IdentityContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});

/**
 * Simple in-memory rate limiter for public endpoints.
 * Limits requests per IP address within a time window.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

export const rateLimitedProcedure = t.procedure.use(({ ctx, next }) => {
  const ip = ctx.ip || "unknown";
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later."
      });
    }
    record.count++;
  } else {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }

  return next();
});
