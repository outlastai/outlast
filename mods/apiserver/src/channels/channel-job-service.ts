import { PrismaClient, FollowUp } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import type { ChannelJob, ChannelCallback } from './types';
import type { CommunicationChannel } from '../types/enums';

interface ChannelJobServiceDependencies {
  prisma: PrismaClient;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Service for managing async channel jobs
 * This handles the lifecycle of async message sending
 */
export function createChannelJobService(
  dependencies: ChannelJobServiceDependencies
) {
  const { prisma, logger } = dependencies;

  return {
    /**
     * Create a new channel job (when message is queued)
     */
    async createJob(job: Omit<ChannelJob, 'id' | 'createdAt'>): Promise<string> {
      logger.info('Creating channel job', {
        orderId: job.orderId,
        channel: job.channel,
        attemptNumber: job.attemptNumber
      });

      // Create FollowUp record to track this
      const followUp = await prisma.followUp.create({
        data: {
          orderId: job.orderId,
          channel: job.channel,
          message: job.message,
          success: false,
          attemptNumber: job.attemptNumber,
          response: null
        }
      });

      logger.info('Channel job created', { followUpId: followUp.id });
      return followUp.id;
    },

    /**
     * Update job status when message is sent
     */
    async updateJobStatus(
      followUpId: string,
      status: ChannelJob['status'],
      messageId?: string,
      error?: string
    ): Promise<void> {
      logger.info('Updating channel job status', {
        followUpId,
        status,
        messageId
      });

      await prisma.followUp.update({
        where: { id: followUpId },
        data: {
          success: status === 'SENT' || status === 'DELIVERED',
          response: error || undefined
        }
      });
    },

    /**
     * Process a callback from channel provider (async response)
     */
    async processCallback(callback: ChannelCallback): Promise<void> {
      logger.info('Processing channel callback', {
        messageId: callback.messageId,
        channel: callback.channel,
        status: callback.status
      });

      // Find the FollowUp by messageId (stored in metadata or we need to track it)
      // For now, we'll need to extend FollowUp model or use a mapping table
      // This is a placeholder - actual implementation will depend on how we track messageIds
      
      // Try to find FollowUp by matching messageId in response field
      // (We store messageId temporarily in response when creating the job)
      // First, try to find by messageId stored in response
      let followUp = await prisma.followUp.findFirst({
        where: {
          channel: callback.channel,
          response: callback.messageId // messageId might be stored here temporarily
        },
        orderBy: { timestamp: 'desc' }
      });

      // If not found, try to find the most recent pending follow-up for this channel
      // This is a fallback - ideally we'd store messageId properly
      if (!followUp) {
        const followUps = await prisma.followUp.findMany({
          where: {
            channel: callback.channel,
            success: false // Still pending
          },
          orderBy: { timestamp: 'desc' },
          take: 1
        });

        if (followUps.length > 0) {
          followUp = followUps[0];
        }
      }

      if (followUp) {
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            success: callback.status === 'DELIVERED' || callback.status === 'READ' || callback.status === 'REPLIED',
            // Store the actual response/error, or keep messageId if it was stored there
            response: callback.response || callback.error || (followUp.response === callback.messageId ? callback.messageId : followUp.response) || undefined
          }
        });

        logger.info('FollowUp updated from callback', {
          followUpId: followUp.id,
          orderId: followUp.orderId,
          status: callback.status,
          messageId: callback.messageId
        });
      } else {
        logger.warn('No matching FollowUp found for callback', {
          messageId: callback.messageId,
          channel: callback.channel,
          status: callback.status
        });
      }
    },

    /**
     * Get pending jobs that need retry
     */
    async getPendingJobs(
      channel?: CommunicationChannel,
      maxAge?: number // milliseconds
    ): Promise<FollowUp[]> {
      const where: any = {
        success: false
      };

      if (channel) {
        where.channel = channel;
      }

      const followUps = await prisma.followUp.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        take: 100
      });

      // Filter by age if provided
      if (maxAge) {
        const cutoff = new Date(Date.now() - maxAge);
        return followUps.filter(f => f.timestamp < cutoff);
      }

      return followUps;
    }
  };
}

