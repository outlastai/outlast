/**
 * Copyright (C) 2026 by Outlast.
 */
import { z } from "zod";
import {
  createCreateApiKey,
  createDeleteApiKey,
  createListApiKeys,
  createRegenerateApiKey
} from "@fonoster/identity";
import { protectedProcedure, router } from "../trpc.js";
import { createIdentityPrismaClient } from "../../db.js";
import { promisifyHandler } from "../../utils/promisifyHandler.js";

const refInput = z.object({
  ref: z.string().uuid()
});

const createApiKeyInput = z.object({
  workspaceRef: z.string().uuid().optional(),
  role: z.enum(["WORKSPACE_OWNER", "WORKSPACE_ADMIN", "WORKSPACE_MEMBER"]),
  expiresAt: z.number().int().positive().optional()
});

const listApiKeysInput = z
  .object({
    pageSize: z.number().int().positive().optional(),
    pageToken: z.string().optional()
  })
  .optional();

const prisma = createIdentityPrismaClient();
const createApiKey = promisifyHandler(createCreateApiKey(prisma));
const listApiKeys = promisifyHandler(createListApiKeys(prisma));
const regenerateApiKey = promisifyHandler(createRegenerateApiKey(prisma));
const deleteApiKey = promisifyHandler(createDeleteApiKey(prisma));

export const apiKeysRouter = router({
  create: protectedProcedure.input(createApiKeyInput).mutation(async ({ ctx, input }) => {
    const request = {
      role: input.role,
      expiresAt: input.expiresAt,
      ...(input.workspaceRef && { workspaceRef: input.workspaceRef })
    };
    return createApiKey(request, { accessKeyId: ctx.accessKeyId });
  }),
  list: protectedProcedure.input(listApiKeysInput).query(async ({ ctx, input }) => {
    const request = {
      pageSize: input?.pageSize ?? 50,
      pageToken: input?.pageToken
    };
    return listApiKeys(request, { accessKeyId: ctx.accessKeyId });
  }),
  regenerate: protectedProcedure.input(refInput).mutation(async ({ ctx, input }) => {
    return regenerateApiKey({ ref: input.ref }, { accessKeyId: ctx.accessKeyId });
  }),
  delete: protectedProcedure.input(refInput).mutation(async ({ ctx, input }) => {
    return deleteApiKey({ ref: input.ref }, { accessKeyId: ctx.accessKeyId });
  })
});
