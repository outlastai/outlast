/**
 * Copyright (C) 2026 by Outlast.
 */
import { createPrismaClient } from "@fonoster/identity";
import { OUTLAST_IDENTITY_CLOAK_ENCRYPTION_KEY, OUTLAST_IDENTITY_DATABASE_URL } from "./envs.js";

export const createIdentityPrismaClient = () => {
  return createPrismaClient(OUTLAST_IDENTITY_DATABASE_URL, OUTLAST_IDENTITY_CLOAK_ENCRYPTION_KEY);
};
