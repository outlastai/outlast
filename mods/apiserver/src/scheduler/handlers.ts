import { Request, Response } from 'express';
import { getLogger } from '@outlast/logger';
import type { createSchedulerRunner } from './scheduler-runner';
import type { createCronScheduler } from './cron-scheduler';

interface SchedulerHandlersDependencies {
  schedulerRunner: ReturnType<typeof createSchedulerRunner>;
  cronScheduler?: ReturnType<typeof createCronScheduler> | null;
}

export function createSchedulerHandlers(
  dependencies: SchedulerHandlersDependencies
) {
  const { schedulerRunner, cronScheduler } = dependencies;
  const logger = getLogger({ service: 'scheduler', filePath: __filename });

  return {
    /**
     * POST /api/scheduler/run
     * Manually trigger a scheduler run
     */
    async runScheduler(_req: Request, res: Response): Promise<void> {
      try {
        logger.info('Manual scheduler run triggered');
        const result = await schedulerRunner.run();

        res.status(200).json({
          success: true,
          result: {
            processed: result.processed,
            followUpsSent: result.followUpsSent,
            escalationsCreated: result.escalationsCreated,
            errors: result.errors,
            details: result.details.map(d => ({
              orderId: d.orderId,
              orderIdExternal: d.orderIdExternal,
              processed: d.processed,
              followUpSent: d.followUpSent,
              escalated: d.escalated,
              error: d.error
            }))
          }
        });
      } catch (error) {
        logger.error('Scheduler run failed', { error });
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },

    /**
     * POST /api/scheduler/process-order/:orderId
     * Manually trigger AI agent analysis for a specific order
     */
    async processOrder(req: Request, res: Response): Promise<void> {
      try {
        const orderId = req.params.orderId;
        if (!orderId) {
          res.status(400).json({
            success: false,
            error: 'Order ID is required'
          });
          return;
        }

        logger.info('Manual order processing triggered', { orderId });
        const result = await schedulerRunner.processOrder(orderId);

        res.status(200).json({
          success: true,
          result: {
            orderId: result.orderId,
            orderIdExternal: result.orderIdExternal,
            processed: result.processed,
            followUpSent: result.followUpSent,
            escalated: result.escalated,
            skippedReason: result.skippedReason,
            usedAI: result.usedAI,
            error: result.error
          }
        });
      } catch (error) {
        logger.error('Order processing failed', { error });
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },

    /**
     * GET /api/scheduler/config
     * Get scheduler configuration
     */
    async getConfig(_req: Request, res: Response): Promise<void> {
      try {
        const config = schedulerRunner.getConfig();
        res.status(200).json({
          success: true,
          config: {
            ...config,
            cron: cronScheduler ? {
              enabled: cronScheduler.isEnabled(),
              schedule: cronScheduler.getSchedule()
            } : null
          }
        });
      } catch (error) {
        logger.error('Failed to get scheduler config', { error });
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    },

    /**
     * GET /api/scheduler/status
     * Get scheduler and cron status
     */
    async getStatus(_req: Request, res: Response): Promise<void> {
      try {
        res.status(200).json({
          success: true,
          status: {
            cron: cronScheduler ? {
              enabled: cronScheduler.isEnabled(),
              schedule: cronScheduler.getSchedule()
            } : {
              enabled: false,
              reason: 'Email channel service not available'
            }
          }
        });
      } catch (error) {
        logger.error('Failed to get scheduler status', { error });
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
}

