/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { upsertDefaultUser } from "@fonoster/identity";
import { identityConfig } from "@outlast/identity";
import { logger } from "./logger.js";

/**
 * Creates the owner user if OUTLAST_OWNER_* environment variables are set.
 * Uses upsert so it's safe to run on every startup - will update if exists.
 */
export async function createOwnerUser(): Promise<void> {
  const email = process.env.OUTLAST_OWNER_EMAIL;
  const password = process.env.OUTLAST_OWNER_PASSWORD;
  const name = process.env.OUTLAST_OWNER_NAME || "Owner";

  if (!email || !password) {
    logger.verbose("owner user creation skipped (OUTLAST_OWNER_EMAIL/PASSWORD not set)");
    return;
  }

  logger.info("creating owner user", { email, name });

  await upsertDefaultUser(identityConfig, {
    name,
    email,
    password
  });

  logger.info("owner user created successfully", { email });
}
