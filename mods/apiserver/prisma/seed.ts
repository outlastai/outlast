/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString =
  process.env.OUTLAST_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/outlast";

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Add seed data here if needed
  // Example:
  // await prisma.record.create({
  //   data: {
  //     title: "Sample Record"
  //   }
  // });

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
