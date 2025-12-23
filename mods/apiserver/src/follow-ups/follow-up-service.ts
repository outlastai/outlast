import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError, ValidationError, ChannelError } from '@outlast/common';
import type { ChannelService } from '../channels/types';
import type { createChannelJobService } from '../channels/channel-job-service';
import type { SendFollowUpRequest, SendFollowUpResponse } from './types';

interface FollowUpServiceDependencies {
  prisma: PrismaClient;
  channelService: ChannelService;
  channelJobService: ReturnType<typeof createChannelJobService>;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Convert error to string for consistent error handling
 */
function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    if (errorObj.message) {
      return String(errorObj.message);
    }
    if (errorObj.error) {
      return typeof errorObj.error === 'string' 
        ? errorObj.error 
        : JSON.stringify(errorObj.error);
    }
  }
  return JSON.stringify(error);
}

export function createFollowUpService(
  dependencies: FollowUpServiceDependencies
) {
  const { prisma, channelService, channelJobService, logger } = dependencies;

  return {
    async sendFollowUp(
      data: SendFollowUpRequest
    ): Promise<SendFollowUpResponse> {
      logger.info('Sending follow-up', {
        orderId: data.orderId,
        channel: data.channel
      });

      // Try to find order by UUID first, then by external orderId
      let order = await prisma.order.findUnique({
        where: { id: data.orderId },
        include: {
          provider: true
        }
      });

      // If not found by UUID, try by external orderId
      if (!order) {
        logger.verbose('Order not found by UUID, trying external orderId', {
          orderId: data.orderId
        });
        order = await prisma.order.findUnique({
          where: { orderId: data.orderId },
          include: {
            provider: true
          }
        });
      }

      if (!order) {
        logger.warn('Order not found', {
          orderId: data.orderId,
          searchedBy: 'both id and orderId'
        });
        throw new NotFoundError('Order', data.orderId);
      }

      logger.verbose('Order found', {
        id: order.id,
        orderId: order.orderId,
        providerId: order.providerId
      });

      // Get provider contact info with error handling
      let contactInfo: Record<string, string>;
      try {
        contactInfo = JSON.parse(order.provider.contactInfo) as Record<string, string>;
      } catch (error) {
        logger.error('Failed to parse provider contactInfo', {
          error,
          providerId: order.providerId,
          contactInfo: order.provider.contactInfo
        });
        throw new ValidationError(
          'Invalid provider contact information format',
          { providerId: order.providerId, error: error instanceof Error ? error.message : String(error) }
        );
      }

      // Validate contact info structure
      if (!contactInfo || typeof contactInfo !== 'object') {
        throw new ValidationError(
          'Provider contact information must be an object',
          { providerId: order.providerId }
        );
      }

      const contactAddress = contactInfo[data.channel];

      if (!contactAddress) {
        throw new ValidationError(
          `Provider does not have ${data.channel} contact information`,
          { providerId: order.providerId, channel: data.channel, availableChannels: Object.keys(contactInfo) }
        );
      }

      // Use the database UUID for all database operations
      const orderDatabaseId = order.id;

      // Get attempt number (use database UUID)
      const existingFollowUps = await prisma.followUp.count({
        where: { orderId: orderDatabaseId }
      });
      const attemptNumber = existingFollowUps + 1;

      // Create channel job first (use database UUID)
      const jobId = await channelJobService.createJob({
        orderId: orderDatabaseId,
        providerId: order.providerId,
        channel: data.channel,
        message: data.message,
        status: 'PENDING',
        attemptNumber,
        maxRetries: 3
      });

      // Send message via channel service (can use external orderId for metadata)
      let channelResponse;
      try {
        channelResponse = await channelService.sendMessage({
          orderId: orderDatabaseId, // Use database UUID for consistency
          providerId: order.providerId,
          channel: data.channel,
          content: data.message,
          metadata: {
            email: contactAddress,
            orderId: order.orderId, // External orderId for display
            partName: order.partName,
            subject: `Order Update: ${order.orderId}`,
            ...data.metadata
          }
        });
      } catch (error) {
        logger.error('Channel service error', {
          error,
          orderId: data.orderId,
          channel: data.channel
        });

        // Convert error to string for consistent handling
        const errorMessage = errorToString(error);

        await channelJobService.updateJobStatus(
          jobId,
          'FAILED',
          undefined,
          errorMessage
        );

        throw new ChannelError(
          data.channel,
          `Failed to send message: ${errorMessage}`,
          { orderId: data.orderId, jobId, originalError: errorMessage }
        );
      }

      // Update job status and store messageId
      // Store messageId in response field temporarily so we can match it in webhooks
      if (channelResponse.status === 'QUEUED' || channelResponse.status === 'SENT') {
        // Update FollowUp record with success status and messageId
        // TODO: Add messageId field to FollowUp schema in future migration
        await prisma.followUp.update({
          where: { id: jobId },
          data: {
            success: true,
            response: channelResponse.messageId // Store messageId temporarily for webhook matching
          }
        });
        
        // Log the status update (updateJobStatus also logs, but we've already updated the record)
        logger.info('Channel job status updated', {
          followUpId: jobId,
          status: 'SENT',
          messageId: channelResponse.messageId
        });
      } else {
        // Convert error to string if it's an object
        const errorMessage = channelResponse.error 
          ? errorToString(channelResponse.error)
          : 'Unknown error';

        await channelJobService.updateJobStatus(
          jobId,
          'FAILED',
          undefined,
          errorMessage
        );
      }

      logger.info('Follow-up sent', {
        followUpId: jobId,
        messageId: channelResponse.messageId,
        status: channelResponse.status
      });

      // Ensure error is a string, not an object
      const errorMessage = channelResponse.error 
        ? errorToString(channelResponse.error)
        : undefined;

      return {
        followUpId: jobId,
        messageId: channelResponse.messageId,
        channel: data.channel,
        status: channelResponse.status,
        queuedAt: channelResponse.queuedAt,
        error: errorMessage
      };
    }
  };
}

