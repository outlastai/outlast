import { getLogger } from '@outlast/logger';
import type {
  ChannelService,
  ChannelMessage,
  ChannelSendResponse,
  ChannelCallback,
  ChannelConfig
} from './types';
import type { CommunicationChannel } from '../types/enums';

/**
 * Stub implementation of ChannelService
 * This is a placeholder that shows the interface
 * Real implementations (SMS, Email, Voice) will follow this pattern
 */
export function createStubChannelService(
  channel: CommunicationChannel,
  _config: ChannelConfig = {}
): ChannelService {
  const logger = getLogger({ service: 'channels', filePath: __filename });

  return {
    getChannelType(): CommunicationChannel {
      return channel;
    },

    async sendMessage(message: ChannelMessage): Promise<ChannelSendResponse> {
      logger.info('Stub: Sending message', {
        channel: message.channel,
        orderId: message.orderId
      });

      // In real implementation, this would:
      // 1. Queue the message to a job queue
      // 2. Return immediately with QUEUED status
      // 3. Background worker would process it

      const messageId = `stub-${channel}-${Date.now()}`;

      return {
        messageId,
        channel: message.channel,
        status: 'QUEUED',
        queuedAt: new Date()
      };
    },

    async processCallback(callback: ChannelCallback): Promise<void> {
      logger.info('Stub: Processing callback', {
        messageId: callback.messageId,
        channel: callback.channel,
        status: callback.status
      });

      // In real implementation, this would:
      // 1. Find the FollowUp record by messageId
      // 2. Update the status based on callback
      // 3. Create OrderHistory entry if needed
      // 4. Trigger any follow-up actions
    }
  };
}

