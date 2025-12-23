import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import type { CommunicationChannel } from '../types/enums';
import type { createReplyParser, createReplyAnalyzer, InboundEmail } from '@outlast/channels';
import type { createFollowUpService } from '../follow-ups/follow-up-service';

interface InboundEmailHandlerDependencies {
  prisma: PrismaClient;
  replyParser: ReturnType<typeof createReplyParser>;
  replyAnalyzer: ReturnType<typeof createReplyAnalyzer>;
  orderService: {
    updateOrder: (id: string, data: { status?: string; expectedDeliveryDate?: Date | null; priority?: string | null }) => Promise<unknown>;
  };
  orderHistoryService: {
    createOrderHistory: (data: {
      orderId: string;
      type: string;
      aiSummary?: string | null;
      context?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    }) => Promise<unknown>;
  };
  followUpService?: ReturnType<typeof createFollowUpService>;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Handler for inbound email webhooks (replies from providers)
 * Supports multiple email service providers (Resend, Mailgun, SendGrid, etc.)
 */
export function createInboundEmailHandler(
  dependencies: InboundEmailHandlerDependencies
) {
  const { prisma, replyParser, replyAnalyzer, orderService, orderHistoryService, followUpService, logger } = dependencies;

  return {
    /**
     * Handle inbound email webhook
     * Normalizes different provider formats and processes the reply
     */
    async handleInboundEmail(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        logger.info('Received inbound email webhook', {
          provider: req.body.provider || 'unknown',
          headers: Object.keys(req.headers)
        });

        // Normalize the email event from different providers
        const email = this.normalizeInboundEmail(req.body, req.headers);

        // Extract order information from email
        const orderInfo = replyParser.extractOrderInfo(email);

        if (!orderInfo.orderId) {
          logger.warn('Could not extract order ID from email', {
            from: email.from,
            subject: email.subject
          });
          res.status(200).json({ received: true, processed: false, reason: 'no_order_id' });
          return;
        }

        // Find the order (try UUID first, then external orderId)
        let order = await prisma.order.findUnique({
          where: { id: orderInfo.orderId },
          include: { provider: true }
        });

        if (!order) {
          order = await prisma.order.findUnique({
            where: { orderId: orderInfo.orderId },
            include: { provider: true }
          });
        }

        if (!order) {
          logger.warn('Order not found for email reply', {
            orderId: orderInfo.orderId,
            from: email.from
          });
          res.status(200).json({ received: true, processed: false, reason: 'order_not_found' });
          return;
        }

        // Verify the email is from the provider
        const providerContactInfo = JSON.parse(order.provider.contactInfo) as Record<string, string>;
        const providerEmail = providerContactInfo['EMAIL']?.toLowerCase().trim();
        const replyEmail = orderInfo.providerEmail.toLowerCase().trim();

        if (providerEmail !== replyEmail) {
          logger.warn('Email reply not from expected provider', {
            expected: providerEmail,
            received: replyEmail,
            orderId: order.id
          });
          res.status(200).json({ received: true, processed: false, reason: 'email_mismatch' });
          return;
        }

        // Analyze the reply using AI
        const orderContext = {
          orderId: order.orderId,
          status: order.status,
          expectedDeliveryDate: order.expectedDeliveryDate,
          priority: order.priority,
          providerName: order.provider.name
        };

        const analysis = await replyAnalyzer.analyzeReply(email, orderContext);

        logger.info('Reply analysis completed', {
          orderId: order.id,
          shouldUpdateStatus: analysis.shouldUpdateStatus,
          orderStatus: analysis.orderStatus,
          confidence: analysis.confidence
        });

        // Update order status if needed
        if (analysis.shouldUpdateStatus && analysis.orderStatus) {
          try {
            await orderService.updateOrder(order.id, {
              status: analysis.orderStatus,
              expectedDeliveryDate: analysis.expectedDeliveryDate || null,
              priority: analysis.priority || null
            });

            logger.info('Order status updated from email reply', {
              orderId: order.id,
              newStatus: analysis.orderStatus
            });

            // Check if status is DELAYED and reason is missing - automatically ask for reason
            if (analysis.orderStatus === 'DELAYED' && (!analysis.reason || analysis.reason.trim().length === 0)) {
              logger.info('DELAYED status detected without reason, sending follow-up to request reason', {
                orderId: order.id,
                providerId: order.providerId
              });

              if (followUpService) {
                try {
                  // Get provider's preferred channel, default to EMAIL
                  const preferredChannel = (order.provider.preferredChannel || 'EMAIL') as CommunicationChannel;
                  
                  const followUpMessage = `Thank you for the update. We noticed that order ${order.orderId} has been delayed. Could you please provide the reason for the delay? This information will help us better manage expectations and coordinate with our team.`;
                  
                  await followUpService.sendFollowUp({
                    orderId: order.id,
                    channel: preferredChannel,
                    message: followUpMessage,
                    metadata: {
                      autoTriggered: true,
                      reason: 'MISSING_DELAY_REASON',
                      priority: 'NORMAL'
                    }
                  });

                  logger.info('Follow-up sent to request delay reason', {
                    orderId: order.id,
                    channel: preferredChannel
                  });
                } catch (followUpError) {
                  logger.error('Failed to send follow-up for missing delay reason', {
                    orderId: order.id,
                    error: followUpError instanceof Error ? followUpError.message : String(followUpError)
                  });
                  // Don't throw - status update was successful, follow-up failure is non-critical
                }
              } else {
                logger.warn('Follow-up service not available, cannot send automatic follow-up for missing delay reason', {
                  orderId: order.id
                });
              }
            }
          } catch (error) {
            logger.error('Failed to update order status', { error, orderId: order.id });
          }
        }

        // Create order history entry
        try {
          await orderHistoryService.createOrderHistory({
            orderId: order.id,
            type: 'PROVIDER_REPLY',
            aiSummary: analysis.summary,
            context: {
              emailFrom: email.from,
              emailSubject: email.subject,
              emailTimestamp: email.timestamp,
              extractionMethod: orderInfo.extractionMethod,
              extractionConfidence: orderInfo.confidence
            },
            metadata: {
              analysis,
              orderInfo,
              replyContent: replyParser.extractReplyContent(email)
            }
          });

          logger.info('Order history created for email reply', { orderId: order.id });
        } catch (error) {
          logger.error('Failed to create order history', { error, orderId: order.id });
        }

        // Update follow-up record if it exists
        try {
          const followUp = await prisma.followUp.findFirst({
            where: {
              orderId: order.id,
              channel: 'EMAIL',
              success: true
            },
            orderBy: { timestamp: 'desc' }
          });

          if (followUp) {
            await prisma.followUp.update({
              where: { id: followUp.id },
              data: {
                response: analysis.summary,
                success: true
              }
            });

            logger.info('Follow-up record updated with reply', {
              followUpId: followUp.id,
              orderId: order.id
            });
          }
        } catch (error) {
          logger.error('Failed to update follow-up record', { error, orderId: order.id });
        }

        res.status(200).json({
          received: true,
          processed: true,
          orderId: order.id,
          orderStatus: analysis.orderStatus,
          updated: analysis.shouldUpdateStatus
        });
      } catch (error) {
        logger.error('Inbound email processing failed', { error });
        next(error);
      }
    },

    /**
     * Normalize inbound email from different providers to our standard format
     * Supports: Resend, Mailgun, SendGrid, and generic formats
     */
    normalizeInboundEmail(
      body: Record<string, unknown>,
      headers: Record<string, string | string[] | undefined>
    ): InboundEmail {
      // Try to detect provider from body or headers
      const provider = this.detectProvider(body, headers);

      // Normalize based on provider
      switch (provider) {
        case 'mailgun':
          return this.normalizeMailgunEmail(body);
        case 'sendgrid':
          return this.normalizeSendGridEmail(body);
        case 'resend':
          return this.normalizeResendEmail(body);
        default:
          return this.normalizeGenericEmail(body, headers);
      }
    },

    /**
     * Detect email provider from request
     */
    detectProvider(body: Record<string, unknown>, headers: Record<string, string | string[] | undefined>): string {
      // Check headers first
      const userAgent = headers['user-agent'] || headers['User-Agent'];
      if (typeof userAgent === 'string') {
        if (userAgent.toLowerCase().includes('mailgun')) return 'mailgun';
        if (userAgent.toLowerCase().includes('sendgrid')) return 'sendgrid';
        if (userAgent.toLowerCase().includes('resend')) return 'resend';
      }

      // Check body structure
      if (body['signature'] && body['token']) return 'mailgun';
      if (body['_json'] || body['envelope']) return 'sendgrid';
      const data = body['data'] as Record<string, unknown> | undefined;
      if (body['type'] === 'email.received' || (data && ('email_id' in data || 'emailId' in data))) return 'resend';

      return 'generic';
    },

    /**
     * Normalize Mailgun email format
     */
    normalizeMailgunEmail(body: Record<string, unknown>): InboundEmail {
      const recipient = Array.isArray(body['recipient']) ? body['recipient'][0] : body['recipient'];
      const sender = body['sender'] as string;
      const subject = body['subject'] as string;
      const text = body['body-plain'] as string;
      const html = body['body-html'] as string;

      // Parse headers
      const headers: Record<string, string> = {};
      if (typeof body['message-headers'] === 'string') {
        try {
          const parsed = JSON.parse(body['message-headers'] as string) as Array<[string, string]>;
          for (const [key, value] of parsed) {
            headers[key.toLowerCase()] = value;
          }
        } catch {
          // Ignore parse errors
        }
      }

      return {
        messageId: (body['Message-Id'] as string) || (body['message-id'] as string) || `mailgun-${Date.now()}`,
        from: sender || '',
        to: Array.isArray(recipient) ? recipient : [recipient as string],
        subject: subject || '',
        text: text || undefined,
        html: html || undefined,
        headers,
        timestamp: new Date(body['timestamp'] as string || Date.now())
      };
    },

    /**
     * Normalize SendGrid email format
     */
    normalizeSendGridEmail(body: Record<string, unknown>): InboundEmail {
      const envelope = body['envelope'] as Record<string, unknown> || {};
      const from = envelope['from'] as string || body['from'] as string || '';
      const to = (envelope['to'] as string[]) || [body['to'] as string].filter(Boolean);

      return {
        messageId: (body['headers'] as Record<string, string>)?.['message-id'] || `sendgrid-${Date.now()}`,
        from,
        to: Array.isArray(to) ? to : [to as string],
        subject: (body['subject'] as string) || '',
        text: body['text'] as string || undefined,
        html: body['html'] as string || undefined,
        headers: (body['headers'] as Record<string, string>) || {},
        timestamp: new Date(body['timestamp'] as number || Date.now())
      };
    },

    /**
     * Normalize Resend email format (if they add inbound support)
     */
    normalizeResendEmail(body: Record<string, unknown>): InboundEmail {
      const data = (body['data'] as Record<string, unknown>) || {};

      return {
        messageId: ((data['email_id'] as string) || (data['emailId'] as string)) || `resend-${Date.now()}`,
        from: (data['from'] as string) || '',
        to: Array.isArray(data['to']) ? data['to'] as string[] : [(data['to'] as string) || ''],
        subject: (data['subject'] as string) || '',
        text: (data['text'] as string) || undefined,
        html: (data['html'] as string) || undefined,
        headers: (data['headers'] as Record<string, string>) || {},
        timestamp: new Date((body['created_at'] as string) || Date.now())
      };
    },

    /**
     * Normalize generic email format (fallback)
     */
    normalizeGenericEmail(
      body: Record<string, unknown>,
      headers: Record<string, string | string[] | undefined>
    ): InboundEmail {
      const normalizeHeader = (key: string): string => {
        const value = headers[key] || headers[key.toLowerCase()];
        return Array.isArray(value) ? value[0] : (value || '');
      };

      return {
        messageId: normalizeHeader('message-id') || `generic-${Date.now()}`,
        from: (body['from'] as string) || normalizeHeader('from') || '',
        to: Array.isArray(body['to']) ? body['to'] as string[] : [(body['to'] as string) || normalizeHeader('to') || ''],
        subject: (body['subject'] as string) || normalizeHeader('subject') || '',
        text: body['text'] as string || body['body'] as string || undefined,
        html: body['html'] as string || body['body-html'] as string || undefined,
        headers: Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : (v || '')])
        ),
        timestamp: new Date(body['timestamp'] as string || body['date'] as string || Date.now())
      };
    }
  };
}

