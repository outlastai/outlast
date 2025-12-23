// Load environment variables from root .env file
// This is loaded before Prisma tries to read DATABASE_URL
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const rootEnvPath = resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
} else {
  // Fallback to local .env if root doesn't exist
  config();
}

import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { createApp } from './app';

function loadConfig() {
  const port = parseInt(process.env.PORT || '3000', 10);
  // DATABASE_URL from root .env, default to apiserver/prisma directory
  // If DATABASE_URL is relative, resolve it relative to project root
  let databaseUrl = process.env.DATABASE_URL || 'file:./mods/apiserver/prisma/dev.db';
  
  // If it's a relative path, ensure it points to the correct location
  if (databaseUrl.startsWith('file:./')) {
    // If it doesn't include the full path, fix it
    if (!databaseUrl.includes('prisma/')) {
      databaseUrl = databaseUrl.replace('mods/apiserver/dev.db', 'mods/apiserver/prisma/dev.db');
      databaseUrl = databaseUrl.replace('./mods/apiserver/dev.db', './mods/apiserver/prisma/dev.db');
    }
  }

  return {
    port,
    databaseUrl
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = getLogger({ service: 'apiserver', filePath: __filename });
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl
      }
    }
  });

  try {
    await prisma.$connect();
    logger.info('Database connected', { databaseUrl: config.databaseUrl });

    const app = createApp({ prisma, logger });

    app.listen(config.port, () => {
      logger.info('Server started', { port: config.port });
      
      // Start cron scheduler if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cronScheduler = (app as any).cronScheduler;
      if (cronScheduler) {
        cronScheduler.start();
        logger.info('Cron scheduler started');
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    await prisma.$disconnect().catch(() => {
      // Ignore disconnect errors during shutdown
    });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
