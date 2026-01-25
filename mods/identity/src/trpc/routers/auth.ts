/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { z } from "zod";
import {
  createExchangeApiKey,
  createExchangeCredentials,
  createExchangeRefreshToken
} from "@fonoster/identity";
import { publicProcedure, router } from "../trpc.js";
import { createIdentityPrismaClient } from "../../db.js";
import { identityConfig } from "../../identityConfig.js";
import { promisifyHandler } from "../../utils/promisifyHandler.js";

const loginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  twoFactorCode: z.string().min(1).optional()
});

const refreshInput = z.object({
  refreshToken: z.string().min(1)
});

const apiKeyInput = z.object({
  accessKeyId: z.string().min(1),
  accessKeySecret: z.string().min(1)
});

const prisma = createIdentityPrismaClient();
const exchangeCredentials = promisifyHandler(createExchangeCredentials(prisma, identityConfig));
const exchangeRefreshToken = promisifyHandler(createExchangeRefreshToken(prisma, identityConfig));
const exchangeApiKey = promisifyHandler(createExchangeApiKey(prisma, identityConfig));

export const authRouter = router({
  login: publicProcedure.input(loginInput).mutation(async ({ input }) => {
    return exchangeCredentials({
      username: input.username,
      password: input.password,
      twoFactorCode: input.twoFactorCode
    });
  }),
  refresh: publicProcedure.input(refreshInput).mutation(async ({ input }) => {
    return exchangeRefreshToken({ refreshToken: input.refreshToken });
  }),
  exchangeApiKey: publicProcedure.input(apiKeyInput).mutation(async ({ input }) => {
    return exchangeApiKey({
      accessKeyId: input.accessKeyId,
      accessKeySecret: input.accessKeySecret
    });
  }),
  logout: publicProcedure.mutation(() => {
    return { success: true };
  })
});
