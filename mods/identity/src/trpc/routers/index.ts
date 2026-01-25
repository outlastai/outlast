/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { usersRouter } from "./users.js";
import { workspacesRouter } from "./workspaces.js";
import { apiKeysRouter } from "./apikeys.js";

export const identityRouter = router({
  auth: authRouter,
  users: usersRouter,
  workspaces: workspacesRouter,
  apiKeys: apiKeysRouter
});

export type IdentityRouter = typeof identityRouter;
