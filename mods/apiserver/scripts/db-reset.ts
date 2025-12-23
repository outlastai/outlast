// Database cleanup/reset script
// This script deletes all data from the database (but keeps the schema)

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';

// Load .env from project root
// From mods/apiserver/scripts/ -> go up 3 levels to reach project root
const rootEnvPath = resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
} else {
  // Fallback: try to find .env in current working directory or parent directories
  const cwdEnvPath = resolve(process.cwd(), '.env');
  if (existsSync(cwdEnvPath)) {
    config({ path: cwdEnvPath });
  } else {
    config();
  }
}

const logger = getLogger({ service: 'db-reset', filePath: __filename });

async function resetDatabase(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    logger.info('Starting database reset...');

    // Delete in order to respect foreign key constraints
    await prisma.$transaction([
      prisma.escalation.deleteMany(),
      prisma.followUp.deleteMany(),
      prisma.orderHistory.deleteMany(),
      prisma.order.deleteMany(),
      prisma.provider.deleteMany()
    ]);

    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Failed to reset database', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });

