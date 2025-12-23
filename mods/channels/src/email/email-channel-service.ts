import { getLogger } from '@outlast/logger';
import type { ChannelService, ChannelMessage, ChannelSendResponse, ChannelCallback } from '@outlast/apiserver/src/channels/types';
import type { CommunicationChannel } from '@outlast/apiserver/src/types/enums';
import type { createResendClient } from './resend-client';
import type { EmailConfig } from './types';

interface EmailChannelServiceDependencies {
  resendClient: ReturnType<typeof createResendClient>;
  config: EmailConfig;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Email channel service implementing ChannelService interface
 * Handles async email sending via Resend
 */
export function createEmailChannelService(
  dependencies: EmailChannelServiceDependencies
): ChannelService {
  const { resendClient, config, logger } = dependencies;

  return {
    getChannelType(): CommunicationChannel {
      return 'EMAIL';
    },

    async sendMessage(message: ChannelMessage): Promise<ChannelSendResponse> {
      logger.info('Email channel: Sending message', {
        orderId: message.orderId,
        providerId: message.providerId,
        to: message.metadata?.email as string
      });

      try {
        // Extract email from metadata or use provider contact info
        const toEmail = (message.metadata?.email as string) || 
                       (message.metadata?.to as string);

        if (!toEmail) {
          throw new Error('Email address not provided in message metadata');
        }

        // Generate subject from order context
        // Include order ID in subject for reply tracking
        const externalOrderId = message.metadata?.orderId as string || message.orderId;
        const subject = message.metadata?.subject as string ||
                       `Order Update: ${externalOrderId}`;

        // Format email content
        const htmlContent = formatEmailContent(message.content, message.metadata);

        // Send email via Resend
        const result = await resendClient.sendEmail({
          to: toEmail,
          subject,
          html: htmlContent,
          text: message.content,
          replyTo: config.replyTo,
          metadata: {
            orderId: message.orderId,
            providerId: message.providerId,
            ...message.metadata
          }
        });

        logger.info('Email queued successfully', {
          messageId: result.id,
          orderId: message.orderId
        });

        return {
          messageId: result.id,
          channel: 'EMAIL',
          status: 'QUEUED',
          queuedAt: new Date(result.created_at)
        };
      } catch (error) {
        logger.error('Failed to send email', {
          error,
          orderId: message.orderId
        });

        // Convert error to string for consistent handling
        let errorMessage: string;
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          // Try to extract meaningful error information
          const errorObj = error as Record<string, unknown>;
          if (errorObj.message) {
            errorMessage = String(errorObj.message);
          } else if (errorObj.error) {
            errorMessage = typeof errorObj.error === 'string' 
              ? errorObj.error 
              : JSON.stringify(errorObj.error);
          } else {
            errorMessage = JSON.stringify(error);
          }
        } else {
          errorMessage = 'Unknown error';
        }

        return {
          messageId: `failed-${Date.now()}`,
          channel: 'EMAIL',
          status: 'FAILED',
          queuedAt: new Date(),
          error: errorMessage
        };
      }
    },

    async processCallback(callback: ChannelCallback): Promise<void> {
      logger.info('Email channel: Processing callback', {
        messageId: callback.messageId,
        status: callback.status
      });

      // The callback processing is handled by ChannelJobService
      // This method is here for future email-specific processing
      // For now, we just log it
      logger.info('Email callback processed', {
        messageId: callback.messageId,
        status: callback.status,
        timestamp: callback.timestamp
      });
    }
  };
}

/**
 * Format email content with HTML
 */
function formatEmailContent(content: string, metadata?: Record<string, unknown>): string {
      const orderId = metadata?.orderId as string || 'N/A';
      const orderLink = metadata?.orderLink as string;

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Order Update</h1>
              </div>
              <div class="content">
                <p><strong>Order ID:</strong> ${orderId}</p>
                ${orderLink ? `<p><a href="${orderLink}">View Order Details</a></p>` : ''}
                <hr>
                <p>${content.replace(/\n/g, '<br>')}</p>
              </div>
              <div class="footer">
                <p>This is an automated message from OutLast Logistics System</p>
              </div>
            </div>
          </body>
        </html>
      `;
}

