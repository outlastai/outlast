// Load environment variables from root
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const rootEnvPath = resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
} else {
  config();
}

import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { createApiClient, createTools, createAgent, createWorkflows } from '@outlast/ai';
// import { createOrderService } from '../orders/order-service'; // Not used currently
import { createOrderHistoryService } from '../order-history/order-history-service';
import { createFollowUpService } from '../follow-ups/follow-up-service';
import { createChannelJobService } from '../channels/channel-job-service';
import { createSchedulerService } from './scheduler-service';
import type { SchedulerConfig } from './types';
import type { ChannelService } from '../channels/types';

interface SchedulerRunnerDependencies {
  prisma: PrismaClient;
  channelService: ChannelService;
  config?: Partial<SchedulerConfig>;
}

/**
 * Create and configure the scheduler runner
 * This initializes all dependencies and returns a runnable scheduler
 */
export function createSchedulerRunner(
  dependencies: SchedulerRunnerDependencies
) {
  const { prisma, channelService, config: customConfig } = dependencies;
  const logger = getLogger({ service: 'scheduler', filePath: __filename });

  // Default scheduler configuration
  const schedulerConfig: SchedulerConfig = {
    minDaysBetweenFollowUps: parseInt(
      process.env.MIN_DAYS_BETWEEN_FOLLOW_UPS || '7',
      10
    ),
    maxFollowUpAttempts: parseInt(
      process.env.MAX_FOLLOW_UP_ATTEMPTS || '5',
      10
    ),
    escalationThreshold: parseInt(
      process.env.ESCALATION_THRESHOLD || '3',
      10
    ),
    batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '50', 10),
    enabledStatuses: ['PENDING', 'IN_TRANSIT', 'DELAYED'],
    ...customConfig
  };

  // Initialize services
  // const orderService = createOrderService({ prisma, logger }); // Not used currently
  const orderHistoryService = createOrderHistoryService({ prisma, logger });
  const channelJobService = createChannelJobService({ prisma, logger });
  const followUpService = createFollowUpService({
    prisma,
    channelService,
    channelJobService,
    logger
  });

  // Initialize AI agent
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const apiClient = createApiClient(apiBaseUrl);
  const tools = createTools({ apiClient });
  
  let agentPromise: Promise<any> | null = null;
  
  async function getAgent() {
    if (!agentPromise) {
      agentPromise = createAgent({
        config: {
          apiKey: process.env.OPENAI_API_KEY || '',
          model: process.env.AI_MODEL || 'gpt-4',
          temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
          apiBaseUrl
        },
        tools,
        logger: getLogger({ service: 'ai', filePath: __filename })
      });
    }
    return agentPromise;
  }

  // Create AI workflows wrapper
  const aiWorkflows = {
    async analyzeOrder(orderId: string) {
      const agent = await getAgent();
      const workflows = createWorkflows({ agent, logger });
      const analysis = await workflows.analyzeOrder(orderId);
      return {
        shouldFollowUp: analysis.shouldFollowUp,
        reasoning: analysis.reasoning
      };
    },
    async decideFollowUp(orderId: string) {
      const agent = await getAgent();
      const workflows = createWorkflows({ agent, logger });
      return await workflows.decideFollowUp(orderId);
    }
  };

  // Create scheduler service
  const schedulerService = createSchedulerService({
    prisma,
    aiWorkflows,
    followUpService,
    orderHistoryService,
    config: schedulerConfig,
    logger
  });

  return {
    /**
     * Run the scheduler once
     */
    async run() {
      logger.info('Starting scheduler run');
      return await schedulerService.run();
    },

    /**
     * Process a single order through the AI agent
     * This allows manual triggering of the agent for a specific order
     */
    async processOrder(orderId: string) {
      logger.info('Manually processing order', { orderId });
      return await schedulerService.processOrder(orderId);
    },

    /**
     * Get scheduler configuration
     */
    getConfig(): SchedulerConfig {
      return schedulerConfig;
    }
  };
}

