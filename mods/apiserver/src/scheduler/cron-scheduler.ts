import * as cron from 'node-cron';
import { getLogger } from '@outlast/logger';
import type { createSchedulerRunner } from './scheduler-runner';

interface CronSchedulerDependencies {
  schedulerRunner: ReturnType<typeof createSchedulerRunner>;
  schedule?: string; // Cron expression (default: every hour)
  enabled?: boolean; // Whether cron is enabled (default: true)
}

/**
 * Cron-based scheduler that runs the scheduler service periodically
 */
export function createCronScheduler(
  dependencies: CronSchedulerDependencies
) {
  const { schedulerRunner, schedule, enabled = true } = dependencies;
  const logger = getLogger({ service: 'cron-scheduler', filePath: __filename });

  // Default: run every hour at minute 0
  const cronSchedule = schedule || '0 * * * *';
  let cronTask: cron.ScheduledTask | null = null;

  return {
    /**
     * Start the cron scheduler
     */
    start(): void {
      if (!enabled) {
        logger.info('Cron scheduler disabled');
        return;
      }

      if (cronTask) {
        logger.warn('Cron scheduler already started');
        return;
      }

      // Validate cron expression
      if (!cron.validate(cronSchedule)) {
        logger.error('Invalid cron schedule', { schedule: cronSchedule });
        throw new Error(`Invalid cron schedule: ${cronSchedule}`);
      }

      logger.info('Starting cron scheduler', { schedule: cronSchedule });

      cronTask = cron.schedule(cronSchedule, async () => {
        logger.info('Cron job triggered - running scheduler');
        try {
          const result = await schedulerRunner.run();
          logger.info('Cron job completed', {
            processed: result.processed,
            followUpsSent: result.followUpsSent,
            escalationsCreated: result.escalationsCreated,
            errors: result.errors
          });
        } catch (error) {
          logger.error('Cron job failed', { error });
        }
      });

      logger.info('Cron scheduler started', { schedule: cronSchedule });
    },

    /**
     * Stop the cron scheduler
     */
    stop(): void {
      if (cronTask) {
        cronTask.stop();
        cronTask = null;
        logger.info('Cron scheduler stopped');
      }
    },

    /**
     * Get the current cron schedule
     */
    getSchedule(): string {
      return cronSchedule;
    },

    /**
     * Check if cron is enabled
     */
    isEnabled(): boolean {
      return enabled;
    }
  };
}

