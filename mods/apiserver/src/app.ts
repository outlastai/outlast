// Environment variables are loaded in index.ts before this module is imported
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { createProviderService, createProviderHandlers, createProviderRoutes } from './providers';
import { createOrderService, createOrderHandlers, createOrderRoutes } from './orders';
import { createOrderHistoryService, createOrderHistoryHandlers, createOrderHistoryRoutes } from './order-history';
import { createChannelJobService } from './channels/channel-job-service';
import { createWebhookHandler } from './channels/webhook-handler';
import { createChannelWebhookHandler } from './channels/channel-webhook-handler';
import { createFollowUpService, createFollowUpHandlers, createFollowUpRoutes } from './follow-ups';
import { createSchedulerRunner, createSchedulerHandlers, createSchedulerRoutes, createCronScheduler } from './scheduler';
import { createErrorHandler } from './middleware';

interface AppDependencies {
  prisma: PrismaClient;
  logger: ReturnType<typeof getLogger>;
}

export function createApp(dependencies: AppDependencies): Express {
  const { prisma, logger } = dependencies;

  const app = express();

  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Provider routes
  const providerService = createProviderService({ prisma, logger });
  const providerHandlers = createProviderHandlers({ providerService, logger });
  const providerRoutes = createProviderRoutes(providerHandlers);
  app.use('/api/providers', providerRoutes);

  // Order routes
  const orderService = createOrderService({ prisma, logger });
  const orderHandlers = createOrderHandlers({ orderService });
  const orderRoutes = createOrderRoutes(orderHandlers);
  app.use('/api/orders', orderRoutes);

  // Order History routes
  const orderHistoryService = createOrderHistoryService({ prisma, logger });
  const orderHistoryHandlers = createOrderHistoryHandlers({ orderHistoryService });
  const orderHistoryRoutes = createOrderHistoryRoutes(orderHistoryHandlers);
  app.use('/api/order-history', orderHistoryRoutes);

  // Channel services and webhooks
  const channelJobService = createChannelJobService({ prisma, logger });
  
  // Initialize email channel if configured
  let emailChannelService: any = null;
  let resendClient: any = null;
  if (process.env.RESEND_API_KEY) {
    try {
      // Dynamic require for optional dependency
      const { createResendClient, createEmailChannelService } = require('@outlast/channels');
      
      resendClient = createResendClient({
        config: {
          apiKey: process.env.RESEND_API_KEY,
          fromEmail: process.env.EMAIL_FROM || 'noreply@outlast.com',
          fromName: process.env.EMAIL_FROM_NAME || 'OutLast',
          replyTo: process.env.EMAIL_REPLY_TO
        },
        logger
      });
      
      emailChannelService = createEmailChannelService({
        resendClient,
        config: {
          apiKey: process.env.RESEND_API_KEY,
          fromEmail: process.env.EMAIL_FROM || 'noreply@outlast.com',
          fromName: process.env.EMAIL_FROM_NAME,
          replyTo: process.env.EMAIL_REPLY_TO
        },
        logger
      });
      
      logger.info('Email channel service initialized');
    } catch (error) {
      logger.warn('Email channel service not available', { error });
    }
  } else {
    logger.warn('RESEND_API_KEY not set, email channel disabled');
  }

  // Follow-up routes (requires channel service)
  let followUpService: ReturnType<typeof createFollowUpService> | undefined;
  if (emailChannelService) {
    followUpService = createFollowUpService({
      prisma,
      channelService: emailChannelService,
      channelJobService,
      logger
    });
    const followUpHandlers = createFollowUpHandlers({ followUpService });
    const followUpRoutes = createFollowUpRoutes(followUpHandlers);
    app.use('/api/follow-ups', followUpRoutes);
  }

  // Unified channel webhook handler (supports EMAIL, SMS, VOICE)
  // Reuse orderService and orderHistoryService created above
  // Pass followUpService if available (requires email channel service)
  const channelWebhookHandler = createChannelWebhookHandler({
    prisma,
    channelJobService,
    orderService,
    orderHistoryService,
    followUpService,
    logger,
    resendClient: resendClient ? {
      getReceivedEmail: resendClient.getReceivedEmail.bind(resendClient)
    } : undefined
  });
  
  // Unified webhook endpoint for all channels
  app.post('/api/webhooks/channel', channelWebhookHandler.handleWebhook);
  
  // Legacy email webhook (for backward compatibility with Resend delivery events)
  const webhookHandler = createWebhookHandler({ channelJobService, logger });
  app.post('/api/webhooks/email', webhookHandler.handleEmailWebhook);
  
  logger.info('Channel webhook handlers initialized');

  // Scheduler routes (requires channel service)
  let cronScheduler: ReturnType<typeof createCronScheduler> | null = null;
  if (emailChannelService) {
    const schedulerRunner = createSchedulerRunner({
      prisma,
      channelService: emailChannelService
    });
    const schedulerHandlers = createSchedulerHandlers({ 
      schedulerRunner,
      cronScheduler: cronScheduler || null
    });
    const schedulerRoutes = createSchedulerRoutes(schedulerHandlers);
    app.use('/api/scheduler', schedulerRoutes);
    logger.info('Scheduler routes initialized');

    // Initialize cron scheduler if enabled
    const cronEnabled = process.env.SCHEDULER_CRON_ENABLED !== 'false';
    const cronSchedule = process.env.SCHEDULER_CRON_SCHEDULE || '0 * * * *'; // Default: every hour
    
    if (cronEnabled) {
      cronScheduler = createCronScheduler({
        schedulerRunner,
        schedule: cronSchedule,
        enabled: cronEnabled
      });
      // Note: Cron scheduler will be started in index.ts after server starts
      logger.info('Cron scheduler configured', { schedule: cronSchedule, enabled: cronEnabled });
    } else {
      logger.info('Cron scheduler disabled via SCHEDULER_CRON_ENABLED=false');
    }
  } else {
    logger.warn('Scheduler disabled - email channel service not available');
  }

  // Export cron scheduler so it can be started in index.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (app as any).cronScheduler = cronScheduler;

  // Error handler (must be last)
  app.use(createErrorHandler(logger));

  return app;
}

