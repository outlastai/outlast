import { Request, Response, NextFunction } from 'express';
import { getLogger } from '@outlast/logger';
import type { createChannelJobService } from './channel-job-service';
import type { ChannelCallback } from './types';
import type { EmailWebhookEvent } from '@outlast/channels';

interface WebhookHandlerDependencies {
  channelJobService: ReturnType<typeof createChannelJobService>;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Handle webhook callbacks from email providers (Resend)
 */
export function createWebhookHandler(
  dependencies: WebhookHandlerDependencies
) {
  const { channelJobService, logger } = dependencies;

  return {
    async handleEmailWebhook(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const event = req.body as EmailWebhookEvent;

        logger.info('Received email webhook', {
          type: event.type,
          emailId: event.data.email_id
        });

        // Map Resend event types to our callback status
        let status: ChannelCallback['status'] = 'DELIVERED';
        switch (event.type) {
          case 'email.sent':
            status = 'DELIVERED'; // Consider sent as delivered for now
            break;
          case 'email.delivered':
            status = 'DELIVERED';
            break;
          case 'email.bounced':
          case 'email.complained':
            status = 'FAILED';
            break;
          case 'email.opened':
            status = 'READ';
            break;
          default:
            status = 'DELIVERED';
        }

        const callback: ChannelCallback = {
          messageId: event.data.email_id,
          channel: 'EMAIL',
          status,
          timestamp: new Date(event.created_at),
          metadata: {
            eventType: event.type,
            from: event.data.from,
            to: event.data.to,
            subject: event.data.subject
          }
        };

        await channelJobService.processCallback(callback);

        res.status(200).json({ received: true });
      } catch (error) {
        logger.error('Webhook processing failed', { error });
        next(error);
      }
    }
  };
}

