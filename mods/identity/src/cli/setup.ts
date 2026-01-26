/**
 * Copyright (C) 2026 by Outlast.
 */
import { setupIdentityDatabase } from "../setupDatabase.js";
import { OUTLAST_IDENTITY_DATABASE_URL } from "../envs.js";

const run = async () => {
  if (!OUTLAST_IDENTITY_DATABASE_URL) {
    throw new Error("OUTLAST_IDENTITY_DATABASE_URL is required.");
  }

  await setupIdentityDatabase(OUTLAST_IDENTITY_DATABASE_URL);

  console.log("Identity database setup complete.");
};

run().catch((error) => {
  console.error("Identity database setup failed:", error);
  process.exit(1);
});
