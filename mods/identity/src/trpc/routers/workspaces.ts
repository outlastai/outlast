/**
 * Copyright (C) 2026 by Outlast.
 */
import { z } from "zod";
import {
  createCreateWorkspace,
  createDeleteWorkspace,
  createGetWorkspace,
  createInviteUserToWorkspace,
  createListWorkspaceMembers,
  createListWorkspaces,
  createRemoveUserFromWorkspace,
  createResendWorkspaceMembershipInvitation,
  createUpdateWorkspace,
  sendInvite
} from "@fonoster/identity";
import { protectedProcedure, router } from "../trpc.js";
import { createIdentityPrismaClient } from "../../db.js";
import { identityConfig } from "../../identityConfig.js";
import { promisifyHandler } from "../../utils/promisifyHandler.js";

const refInput = z.object({
  ref: z.string().uuid()
});

const listRequestInput = z
  .object({
    pageSize: z.number().int().positive().optional(),
    pageToken: z.string().optional()
  })
  .optional();

const createWorkspaceInput = z.object({
  name: z.string().min(1)
});

const updateWorkspaceInput = z.object({
  ref: z.string().uuid(),
  name: z.string().min(1)
});

const inviteInput = z.object({
  workspaceRef: z.string().uuid(),
  userRef: z.string().uuid(),
  role: z.enum(["WORKSPACE_OWNER", "WORKSPACE_ADMIN", "WORKSPACE_MEMBER"])
});

const removeMemberInput = z.object({
  workspaceRef: z.string().uuid(),
  userRef: z.string().uuid()
});

const prisma = createIdentityPrismaClient();
const createWorkspace = promisifyHandler(createCreateWorkspace(prisma));
const getWorkspace = promisifyHandler(createGetWorkspace(prisma));
const listWorkspaces = promisifyHandler(createListWorkspaces(prisma));
const updateWorkspace = promisifyHandler(createUpdateWorkspace(prisma));
const deleteWorkspace = promisifyHandler(createDeleteWorkspace(prisma));
const inviteUserToWorkspace = promisifyHandler(
  createInviteUserToWorkspace(prisma, identityConfig, sendInvite)
);
const resendWorkspaceMembershipInvitation = promisifyHandler(
  createResendWorkspaceMembershipInvitation(prisma, identityConfig, sendInvite)
);
const listWorkspaceMembers = promisifyHandler(createListWorkspaceMembers(prisma));
const removeUserFromWorkspace = promisifyHandler(createRemoveUserFromWorkspace(prisma));

export const workspacesRouter = router({
  create: protectedProcedure.input(createWorkspaceInput).mutation(async ({ ctx, input }) => {
    return createWorkspace(input, { token: ctx.accessToken });
  }),
  get: protectedProcedure.input(refInput).query(async ({ ctx, input }) => {
    return getWorkspace({ ref: input.ref }, { token: ctx.accessToken });
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    return listWorkspaces({}, { token: ctx.accessToken });
  }),
  update: protectedProcedure.input(updateWorkspaceInput).mutation(async ({ ctx, input }) => {
    return updateWorkspace(input, { token: ctx.accessToken });
  }),
  delete: protectedProcedure.input(refInput).mutation(async ({ ctx, input }) => {
    return deleteWorkspace({ ref: input.ref }, { token: ctx.accessToken });
  }),
  inviteUser: protectedProcedure.input(inviteInput).mutation(async ({ ctx, input }) => {
    return inviteUserToWorkspace(input, {
      token: ctx.accessToken,
      accessKeyId: ctx.accessKeyId
    });
  }),
  resendInvite: protectedProcedure
    .input(z.object({ workspaceRef: z.string().uuid(), userRef: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return resendWorkspaceMembershipInvitation(input, {
        token: ctx.accessToken,
        accessKeyId: ctx.accessKeyId
      });
    }),
  listMembers: protectedProcedure.input(listRequestInput).query(async ({ ctx, input }) => {
    const request = {
      pageSize: input?.pageSize ?? 50,
      pageToken: input?.pageToken
    };
    return listWorkspaceMembers(request, {
      token: ctx.accessToken,
      accessKeyId: ctx.accessKeyId
    });
  }),
  removeUser: protectedProcedure.input(removeMemberInput).mutation(async ({ ctx, input }) => {
    return removeUserFromWorkspace(input, {
      token: ctx.accessToken,
      accessKeyId: ctx.accessKeyId
    });
  })
});
