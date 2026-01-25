/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts"
  },
  datasource: {
    url: process.env.OUTLAST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/outlast"
  }
});
