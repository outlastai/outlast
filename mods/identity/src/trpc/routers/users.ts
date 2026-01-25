/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { z } from "zod";
import {
  createCreateUser,
  createCreateUserWithOauth2Code,
  createDeleteUser,
  createGetUser,
  createResetPassword,
  createSendResetPasswordCode,
  createUpdateUser
} from "@fonoster/identity";
import {
  createSendVerificationCode,
  createVerifyCode
} from "@fonoster/identity/dist/verification/index.js";
import { protectedProcedure, rateLimitedProcedure, router } from "../trpc.js";
import { createIdentityPrismaClient } from "../../db.js";
import { identityConfig } from "../../identityConfig.js";
import { promisifyHandler } from "../../utils/promisifyHandler.js";

const contactTypeSchema = z.enum(["EMAIL", "PHONE"]);

const createUserInput = z.object({
  name: z.string().max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  avatar: z.string().url().max(255).optional(),
  phone: z.string().max(20).optional()
});

const updateUserInput = z.object({
  ref: z.string().uuid(),
  name: z.string().max(50).optional(),
  password: z.string().min(8).max(100).optional(),
  avatar: z.string().url().max(255).optional(),
  phone: z.string().max(20).optional()
});

const refInput = z.object({
  ref: z.string().uuid()
});

const sendVerificationCodeInput = z.object({
  contactType: contactTypeSchema,
  value: z.string().min(1)
});

const verifyCodeInput = z.object({
  username: z.string().min(1),
  contactType: contactTypeSchema,
  value: z.string().min(1),
  verificationCode: z.string().min(1)
});

const sendResetPasswordCodeInput = z.object({
  username: z.string().min(1),
  resetPasswordUrl: z.string().url()
});

const resetPasswordInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  verificationCode: z.string().min(1)
});

const prisma = createIdentityPrismaClient();
const createUser = promisifyHandler(createCreateUser(prisma));
const createUserWithOauth2Code = promisifyHandler(
  createCreateUserWithOauth2Code(prisma, identityConfig)
);
const getUser = promisifyHandler(createGetUser(prisma));
const updateUser = promisifyHandler(createUpdateUser(prisma));
const deleteUser = promisifyHandler(createDeleteUser(prisma));
const sendVerificationCode = promisifyHandler(createSendVerificationCode(prisma, identityConfig));
const verifyCode = promisifyHandler(createVerifyCode(prisma));
const sendResetPasswordCode = promisifyHandler(createSendResetPasswordCode(prisma, identityConfig));
const resetPassword = promisifyHandler(createResetPassword(prisma));

export const usersRouter = router({
  create: rateLimitedProcedure.input(createUserInput).mutation(async ({ input }) => {
    return createUser(input);
  }),
  createWithOauth2Code: rateLimitedProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return createUserWithOauth2Code(input);
    }),
  get: protectedProcedure.input(refInput).query(async ({ ctx, input }) => {
    return getUser({ ref: input.ref }, { token: ctx.accessToken });
  }),
  update: protectedProcedure.input(updateUserInput).mutation(async ({ ctx, input }) => {
    return updateUser(input, { token: ctx.accessToken });
  }),
  delete: protectedProcedure.input(refInput).mutation(async ({ ctx, input }) => {
    return deleteUser({ ref: input.ref }, { token: ctx.accessToken });
  }),
  sendVerificationCode: protectedProcedure
    .input(sendVerificationCodeInput)
    .mutation(async ({ input }) => {
      return sendVerificationCode(input);
    }),
  verifyCode: protectedProcedure.input(verifyCodeInput).mutation(async ({ input }) => {
    return verifyCode(input);
  }),
  sendResetPasswordCode: protectedProcedure
    .input(sendResetPasswordCodeInput)
    .mutation(async ({ input }) => {
      return sendResetPasswordCode(input);
    }),
  resetPassword: protectedProcedure.input(resetPasswordInput).mutation(async ({ input }) => {
    return resetPassword(input);
  })
});
