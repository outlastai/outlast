/**
 * Copyright (C) 2026 by Outlast.
 */
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString =
  process.env.OUTLAST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/outlast";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
