/**
 * Copyright (C) 2026 by Outlast.
 */
import { TRPCError } from "@trpc/server";
import { verifyToken } from "./verifyToken.js";
import type { TokenPayload, VerifyTokenOptions } from "./types.js";

export type AuthMiddlewareOptions = {
  publicKey: string;
  verify?: VerifyTokenOptions;
  getToken: (ctx: unknown) => string | undefined;
  setUser?: (ctx: unknown, user: TokenPayload) => void;
};

export const createAuthMiddleware = (options: AuthMiddlewareOptions) => {
  return async ({ ctx, next }: { ctx: unknown; next: () => Promise<unknown> }) => {
    const token = options.getToken(ctx);
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const payload = verifyToken(token, options.publicKey, options.verify);

    options.setUser?.(ctx, payload);

    return next();
  };
};
