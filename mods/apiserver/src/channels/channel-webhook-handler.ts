import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import type { ChannelCallback } from './types';
import type { CommunicationChannel } from '../types/enums';
import type { createChannelJobService } from './channel-job-service';
import type { createOrderService } from '../orders/order-service';
import type { createOrderHistoryService } from '../order-history/order-history-service';
import type { createFollowUpService } from '../follow-ups/follow-up-service';

interface ChannelWebhookHandlerDependencies {
  prisma: PrismaClient;
  channelJobService: ReturnType<typeof createChannelJobService>;
  orderService: ReturnType<typeof createOrderService>;
  orderHistoryService: ReturnType<typeof createOrderHistoryService>;
  followUpService?: ReturnType<typeof createFollowUpService>;
  logger: ReturnType<typeof getLogger>;
  resendClient?: {
    getReceivedEmail: (emailId: string) => Promise<{
      id: string;
      from: string;
      to: string[];
      subject: string;
      text?: string;
      html?: string;
      headers?: Record<string, string>;
      created_at: string;
    }>;
  };
}

/**
 * Unified webhook handler for all channels (EMAIL, SMS, VOICE)
 * Accepts ChannelCallback format and routes to appropriate channel processors
 */
export function createChannelWebhookHandler(
  dependencies: ChannelWebhookHandlerDependencies
) {
  const { prisma, channelJobService, orderService, orderHistoryService, followUpService, logger, resendClient } = dependencies;

  // Create handler object with methods
  const handler = {
    /**
     * Handle webhook from any channel provider
     * Detects channel type and normalizes to ChannelCallback format
     */
    async handleWebhook(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        logger.info('Received channel webhook', {
          headers: Object.keys(req.headers),
          bodyKeys: Object.keys(req.body || {})
        });

        // Detect channel and normalize to ChannelCallback
        const callback = await handler.normalizeWebhook(req.body, req.headers);
        
        logger.verbose('Webhook normalization result', {
          callback: callback ? {
            channel: callback.channel,
            status: callback.status,
            messageId: callback.messageId
          } : null
        });

        if (!callback) {
          logger.warn('Could not normalize webhook', { body: req.body });
          res.status(400).json({ error: 'Invalid webhook format' });
          return;
        }

        logger.info('Normalized webhook to callback', {
          channel: callback.channel,
          status: callback.status,
          messageId: callback.messageId
        });

        // Process the callback (updates FollowUp records)
        await channelJobService.processCallback(callback);

        // Handle channel-specific processing (e.g., replies, status updates)
        await handler.processChannelCallback(callback);

        res.status(200).json({ received: true, processed: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Webhook processing failed', {
          error: errorMessage,
          stack: errorStack,
          errorType: error?.constructor?.name,
          body: req.body
        });
        next(error);
      }
    },

    /**
     * Normalize webhook from different providers to ChannelCallback format
     */
    async normalizeWebhook(
      body: Record<string, unknown>,
      headers: Record<string, string | string[] | undefined>
    ): Promise<ChannelCallback | null> {
      // Detect provider and channel
      const provider = handler.detectProvider(body, headers);
      const channel = handler.detectChannel(body, headers, provider);

      if (!channel) {
        logger.warn('Could not detect channel from webhook', { provider });
        return null;
      }

      // Route to channel-specific normalizer
      switch (channel) {
        case 'EMAIL':
          return handler.normalizeEmailWebhook(body, headers, provider);
        case 'SMS':
          return handler.normalizeSmsWebhook(body, headers, provider);
        case 'VOICE':
          return handler.normalizeVoiceWebhook(body, headers, provider);
        default:
          logger.warn('Unknown channel', { channel });
          return null;
      }
    },

    /**
     * Detect webhook provider (Resend, Twilio, etc.)
     */
    detectProvider(
      body: Record<string, unknown>,
      headers: Record<string, string | string[] | undefined>
    ): string {
      const userAgent = headers['user-agent'] || headers['User-Agent'];
      if (typeof userAgent === 'string') {
        const ua = userAgent.toLowerCase();
        if (ua.includes('resend')) return 'resend';
        if (ua.includes('twilio')) return 'twilio';
        if (ua.includes('mailgun')) return 'mailgun';
        if (ua.includes('sendgrid')) return 'sendgrid';
      }

      // Check body structure
      if (body['type'] && body['data']) return 'resend';
      if (body['MessageSid'] || body['SmsSid']) return 'twilio';
      if (body['signature'] && body['token']) return 'mailgun';

      return 'unknown';
    },

    /**
     * Detect channel type from webhook
     */
    detectChannel(
      body: Record<string, unknown>,
      _headers: Record<string, string | string[] | undefined>,
      provider: string
    ): CommunicationChannel | null {
      // Check explicit channel in body
      if (body['channel']) {
        const channel = String(body['channel']).toUpperCase();
        if (['EMAIL', 'SMS', 'VOICE'].includes(channel)) {
          return channel as CommunicationChannel;
        }
      }

      // Provider-specific detection
      switch (provider) {
        case 'resend':
          // Resend is email-only
          if (body['type']?.toString().startsWith('email.')) return 'EMAIL';
          break;
        case 'twilio':
          // Twilio can be SMS or VOICE
          if (body['MessageSid'] || body['SmsSid']) return 'SMS';
          if (body['CallSid']) return 'VOICE';
          break;
        case 'mailgun':
        case 'sendgrid':
          return 'EMAIL';
      }

      return null;
    },

    /**
     * Normalize Resend email webhook to ChannelCallback
     */
    normalizeEmailWebhook(
      body: Record<string, unknown>,
      _headers: Record<string, string | string[] | undefined>,
      provider: string
    ): ChannelCallback | null {
      try {
        if (provider === 'resend') {
          const eventType = (body['type'] as string) || '';
          const data = (body['data'] as Record<string, unknown>) || {};

          if (!eventType) {
            logger.warn('Resend webhook missing type', { body });
            return null;
          }

          // Map Resend event types to our status
          let status: ChannelCallback['status'] = 'DELIVERED';
          switch (eventType) {
            case 'email.sent':
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
            case 'email.received':
              status = 'REPLIED';
              break;
            default:
              status = 'DELIVERED';
          }

          const emailId = (data['email_id'] as string) || (data['emailId'] as string) || '';
          if (!emailId) {
            logger.warn('Resend webhook missing email_id', { data, eventType });
          }

          const createdAt = body['created_at'];
          let timestamp: Date;
          if (typeof createdAt === 'string') {
            timestamp = new Date(createdAt);
          } else if (createdAt instanceof Date) {
            timestamp = createdAt;
          } else {
            timestamp = new Date();
          }

          // Extract reply content for email.received events
          const replyText = (data['text'] as string) || (data['body'] as string) || '';
          const replyHtml = (data['html'] as string) || undefined;

          return {
            messageId: emailId || `resend-${Date.now()}`,
            channel: 'EMAIL',
            status,
            timestamp,
            // Include reply content in response field for email.received events
            response: eventType === 'email.received' ? replyText : undefined,
            metadata: {
              provider: 'resend',
              eventType,
              from: data['from'],
              to: data['to'],
              subject: data['subject'],
              text: replyText, // For replies (may be empty - need to fetch via API)
              html: replyHtml, // For replies (may be empty - need to fetch via API)
              // Store email_id to fetch full content via Resend Receiving API
              emailId: emailId,
              // Store original email_id that this reply is responding to
              originalEmailId: data['original_email_id'] || data['originalEmailId']
            }
          };
        }
      } catch (error) {
        logger.error('Error normalizing email webhook', {
          error: error instanceof Error ? error.message : String(error),
          provider,
          bodyKeys: Object.keys(body)
        });
        return null;
      }

      // Generic email webhook (fallback)
      return {
        messageId: (body['messageId'] as string) || (body['id'] as string) || '',
        channel: 'EMAIL',
        status: (body['status'] as ChannelCallback['status']) || 'DELIVERED',
        timestamp: new Date((body['timestamp'] as string) || Date.now()),
        metadata: body
      };
    },

    /**
     * Normalize SMS webhook to ChannelCallback
     */
    normalizeSmsWebhook(
      body: Record<string, unknown>,
      _headers: Record<string, string | string[] | undefined>,
      provider: string
    ): ChannelCallback | null {
      if (provider === 'twilio') {
        const messageStatus = body['MessageStatus'] as string;
        let status: ChannelCallback['status'] = 'DELIVERED';

        switch (messageStatus) {
          case 'delivered':
            status = 'DELIVERED';
            break;
          case 'failed':
          case 'undelivered':
            status = 'FAILED';
            break;
          case 'read':
            status = 'READ';
            break;
          default:
            status = 'DELIVERED';
        }

        return {
          messageId: (body['MessageSid'] as string) || (body['SmsSid'] as string) || '',
          channel: 'SMS',
          status,
          timestamp: new Date(),
          response: body['Body'] as string || undefined,
          metadata: {
            provider: 'twilio',
            from: body['From'],
            to: body['To']
          }
        };
      }

      return null;
    },

    /**
     * Normalize Voice webhook to ChannelCallback
     */
    normalizeVoiceWebhook(
      body: Record<string, unknown>,
      _headers: Record<string, string | string[] | undefined>,
      provider: string
    ): ChannelCallback | null {
      if (provider === 'twilio') {
        const callStatus = body['CallStatus'] as string;
        let status: ChannelCallback['status'] = 'DELIVERED';

        switch (callStatus) {
          case 'completed':
            status = 'DELIVERED';
            break;
          case 'failed':
          case 'busy':
          case 'no-answer':
            status = 'FAILED';
            break;
          default:
            status = 'DELIVERED';
        }

        return {
          messageId: (body['CallSid'] as string) || '',
          channel: 'VOICE',
          status,
          timestamp: new Date(),
          metadata: {
            provider: 'twilio',
            from: body['From'],
            to: body['To'],
            callStatus
          }
        };
      }

      return null;
    },

    /**
     * Process channel-specific callbacks (replies, status updates, etc.)
     */
    async processChannelCallback(callback: ChannelCallback): Promise<void> {
      try {
        // Handle replies (EMAIL replies, SMS replies, etc.)
        if (callback.status === 'REPLIED') {
          await handler.handleReply(callback);
        }

        // Handle other channel-specific logic here
        // e.g., update order status based on delivery confirmation
      } catch (error) {
        logger.error('Error processing channel callback', {
          error: error instanceof Error ? error.message : String(error),
          channel: callback.channel,
          status: callback.status
        });
        // Don't throw - we don't want to fail the webhook if reply processing fails
      }
    },

    /**
     * Handle reply from any channel
     */
    async handleReply(callback: ChannelCallback): Promise<void> {
      logger.info('Processing reply', {
        channel: callback.channel,
        messageId: callback.messageId,
        hasResponse: !!callback.response,
        metadata: callback.metadata
      });

      // Find the order associated with this message
      // For Resend email.received events, the messageId in the callback is the REPLY email ID
      // We need to find the original follow-up by extracting order ID from the subject
      let followUp = null;
      
      const metadata = callback.metadata || {};
      const subject = (metadata['subject'] as string) || '';
      
      logger.verbose('Searching for matching follow-up', {
        callbackMessageId: callback.messageId,
        subject,
        from: metadata['from']
      });

      // PRIMARY METHOD: Extract order ID from subject line
      // Subject format: "Re: Order Update: PT-TBL-HYD" or "Re: Order Update: 253e1765-36b8-4816-973b-e49fb1b554ac"
      // This is the most reliable method for email.received events
      if (subject) {
        // Try UUID format first (most common for our system)
        const uuidMatch = subject.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        
        // Try "Order Update: <orderId>" pattern (e.g., "Re: Order Update: PT-TBL-HYD")
        const orderUpdateMatch = subject.match(/order\s+update\s*:\s*([A-Z0-9-]+)/i);
        
        // Try generic order ID pattern after colon (e.g., "Order ID: PT-TBL-HYD")
        const orderIdPatternMatch = subject.match(/(?:order\s*(?:id|#)?\s*:?\s*)([A-Z0-9-]{3,})/i);
        
        // Use the first match found (UUID > Order Update > generic pattern)
        const orderIdMatch = uuidMatch || orderUpdateMatch || orderIdPatternMatch;
        
        if (orderIdMatch) {
          const extractedOrderId = orderIdMatch[1];
          logger.info('Extracted order ID from subject', { extractedOrderId });
          
          // Find order by extracted ID (try UUID first, then external orderId)
          let order = await prisma.order.findUnique({
            where: { id: extractedOrderId },
            include: { provider: true }
          });
          
          if (!order) {
            order = await prisma.order.findUnique({
              where: { orderId: extractedOrderId },
              include: { provider: true }
            });
          }
          
          if (order) {
            logger.info('Found order for reply', {
              orderId: order.id,
              orderOrderId: order.orderId
            });
            
            // Find most recent follow-up for this order
            followUp = await prisma.followUp.findFirst({
              where: {
                orderId: order.id,
                channel: callback.channel,
                success: true
              },
              orderBy: { timestamp: 'desc' },
              include: {
                order: {
                  include: { provider: true }
                }
              }
            });
            
            if (followUp) {
              logger.info('Found follow-up by order ID', {
                followUpId: followUp.id,
                orderId: followUp.orderId,
                orderOrderId: followUp.order.orderId
              });
            } else {
              logger.warn('Order found but no follow-up found', {
                orderId: order.id,
                channel: callback.channel
              });
            }
          } else {
            logger.warn('Could not find order for extracted ID', {
              extractedOrderId,
              subject
            });
          }
        } else {
          logger.warn('Could not extract order ID from subject', { subject });
        }
      }

      // FALLBACK METHOD: Try to match by messageId stored in response field
      // This is less reliable for email.received since messageId is the reply ID
      let checkedFollowUpsCount = 0;
      if (!followUp) {
        logger.verbose('Trying fallback: matching by messageId in response field');
        const allRecentFollowUps = await prisma.followUp.findMany({
          where: {
            channel: callback.channel,
            success: true,
            response: { not: null }
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
          include: {
            order: {
              include: { provider: true }
            }
          }
        });

        checkedFollowUpsCount = allRecentFollowUps.length;

        // Check if any follow-up's response field matches this messageId
        for (const fup of allRecentFollowUps) {
          if (fup.response === callback.messageId) {
            followUp = fup;
            logger.info('Found follow-up by messageId match (fallback)', {
              followUpId: followUp.id,
              orderId: followUp.orderId
            });
            break;
          }
        }
      }

      if (!followUp) {
        logger.warn('No follow-up found for reply', {
          channel: callback.channel,
          messageId: callback.messageId,
          subject: metadata['subject'],
          from: metadata['from'],
          checkedFollowUps: checkedFollowUpsCount
        });
        return;
      }

      logger.info('Found matching follow-up for reply', {
        followUpId: followUp.id,
        orderId: followUp.orderId,
        orderOrderId: followUp.order.orderId
      });

      const order = followUp.order;

      // Channel-specific reply processing
      if (callback.channel === 'EMAIL') {
        await handler.handleEmailReply(callback, order.id, followUp.id);
      } else if (callback.channel === 'SMS') {
        await handler.handleSmsReply(callback, order.id, followUp.id);
      } else if (callback.channel === 'VOICE') {
        await handler.handleVoiceReply(callback, order.id, followUp.id);
      }
    },

    /**
     * Handle email reply (extract order info, analyze, update status)
     */
    async handleEmailReply(
      callback: ChannelCallback,
      orderId: string,
      followUpId: string
    ): Promise<void> {
      try {
        let createReplyAnalyzer: any;
        try {
          createReplyAnalyzer = require('@outlast/channels').createReplyAnalyzer;
        } catch (requireError) {
          logger.warn('Could not load reply analyzer, skipping email reply processing', { requireError });
          return;
        }

        // Create AI service for reply analysis - REQUIRED
        if (!process.env.OPENAI_API_KEY) {
          logger.error('OPENAI_API_KEY is required for email reply analysis. Cannot process email reply.', {
            orderId,
            messageId: callback.messageId
          });
          return;
        }

        let aiService: any;
        try {
          const { createReplyAnalyzerService } = require('@outlast/ai');
          aiService = createReplyAnalyzerService({
            config: {
              apiKey: process.env.OPENAI_API_KEY,
              model: process.env.AI_MODEL || 'gpt-4',
              temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3')
            },
            logger
          });
          logger.info('AI reply analyzer service initialized');
        } catch (aiError) {
          logger.error('Failed to initialize AI reply analyzer service', {
            error: aiError instanceof Error ? aiError.message : String(aiError),
            stack: aiError instanceof Error ? aiError.stack : undefined,
            orderId,
            messageId: callback.messageId
          });
          return;
        }

        const replyAnalyzer = createReplyAnalyzer({ logger, aiService });

        // For Resend email.received events, fetch the full email content via API
        // The webhook only provides email_id, not the actual content
        const metadata = callback.metadata || {};
        if (metadata['eventType'] === 'email.received' && resendClient && metadata['emailId']) {
          const emailId = metadata['emailId'] as string;
          logger.info('Fetching email content from Resend Receiving API', { emailId });
          
          try {
            const receivedEmail = await resendClient.getReceivedEmail(emailId);
            
            // Update callback metadata with fetched content
            callback.metadata = {
              ...metadata,
              text: receivedEmail.text || metadata['text'],
              html: receivedEmail.html || metadata['html'],
              from: receivedEmail.from || metadata['from'],
              to: receivedEmail.to || metadata['to'],
              subject: receivedEmail.subject || metadata['subject'],
              headers: receivedEmail.headers || metadata['headers']
            };
            
            // Update response field with fetched text
            if (receivedEmail.text) {
              callback.response = receivedEmail.text;
            }
            
            logger.info('Successfully fetched email content from Resend', {
              emailId,
              hasText: !!receivedEmail.text,
              hasHtml: !!receivedEmail.html,
              textLength: receivedEmail.text?.length || 0
            });
          } catch (fetchError) {
            const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
            logger.error('Failed to fetch email content from Resend', {
              error: errorMessage,
              emailId,
              note: 'This may be due to Resend SDK version limitations. Processing reply with available metadata.'
            });
            // Continue processing with whatever we have - might be empty but we'll try
            // The reply analyzer can still work with subject and metadata
          }
        }

        // Extract email from callback metadata
        const email = this.extractEmailFromCallback(callback);
        if (!email) {
          logger.warn('Could not extract email from callback', { callback });
          return;
        }

        // Log if reply content is still empty after fetching
        if (!email.text || email.text.trim().length === 0) {
          logger.warn('Reply email has empty text content after fetch attempt', {
            messageId: callback.messageId,
            subject: email.subject,
            from: email.from,
            eventType: metadata['eventType'],
            hasResendClient: !!resendClient,
            callbackResponse: callback.response?.substring(0, 100),
            metadataText: metadata['text'] ? String(metadata['text']).substring(0, 100) : undefined
          });
          // Continue processing anyway - we can still extract info from subject/metadata
          // Try to use subject as text if text is empty
          if (email.subject && !email.text) {
            email.text = email.subject;
            logger.info('Using subject as email text fallback', { subject: email.subject });
          }
        } else {
          logger.info('Reply email has text content', {
            messageId: callback.messageId,
            textLength: email.text.length,
            textPreview: email.text.substring(0, 200)
          });
        }

        // Analyze reply
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { provider: true }
        });

        if (!order) {
          logger.warn('Order not found for email reply', { orderId });
          return;
        }

        const orderContext = {
          orderId: order.orderId,
          status: order.status,
          expectedDeliveryDate: order.expectedDeliveryDate,
          priority: order.priority,
          providerName: order.provider.name
        };

        const analysis = await replyAnalyzer.analyzeReply(email, orderContext);

        logger.info('Reply analysis result', {
          orderId,
          shouldUpdateStatus: analysis.shouldUpdateStatus,
          orderStatus: analysis.orderStatus,
          currentStatus: order.status,
          confidence: analysis.confidence,
          summary: analysis.summary?.substring(0, 100)
        });

        // Update order status if needed
        if (analysis.shouldUpdateStatus && analysis.orderStatus) {
          logger.info('Updating order status from reply', {
            orderId,
            oldStatus: order.status,
            newStatus: analysis.orderStatus,
            expectedDeliveryDate: analysis.expectedDeliveryDate,
            priority: analysis.priority
          });
          
          try {
            await orderService.updateOrder(orderId, {
              status: analysis.orderStatus,
              expectedDeliveryDate: analysis.expectedDeliveryDate || null,
              priority: analysis.priority || null
            });
            
            logger.info('Order status updated successfully', {
              orderId,
              newStatus: analysis.orderStatus
            });

            // Check if status is DELAYED and reason is missing - automatically ask for reason
            if (analysis.orderStatus === 'DELAYED' && (!analysis.reason || analysis.reason.trim().length === 0)) {
              logger.info('DELAYED status detected without reason, sending follow-up to request reason', {
                orderId,
                providerId: order.providerId
              });

              if (followUpService) {
                try {
                  // Get provider's preferred channel, default to EMAIL
                  const preferredChannel = (order.provider.preferredChannel || 'EMAIL') as CommunicationChannel;
                  
                  const followUpMessage = `Thank you for the update. We noticed that order ${order.orderId} has been delayed. Could you please provide the reason for the delay? This information will help us better manage expectations and coordinate with our team.`;
                  
                  await followUpService.sendFollowUp({
                    orderId,
                    channel: preferredChannel,
                    message: followUpMessage,
                    metadata: {
                      autoTriggered: true,
                      reason: 'MISSING_DELAY_REASON',
                      priority: 'NORMAL'
                    }
                  });

                  logger.info('Follow-up sent to request delay reason', {
                    orderId,
                    channel: preferredChannel
                  });
                } catch (followUpError) {
                  logger.error('Failed to send follow-up for missing delay reason', {
                    orderId,
                    error: followUpError instanceof Error ? followUpError.message : String(followUpError)
                  });
                  // Don't throw - status update was successful, follow-up failure is non-critical
                }
              } else {
                logger.warn('Follow-up service not available, cannot send automatic follow-up for missing delay reason', {
                  orderId
                });
              }
            }
          } catch (updateError) {
            logger.error('Failed to update order status', {
              orderId,
              error: updateError instanceof Error ? updateError.message : String(updateError),
              stack: updateError instanceof Error ? updateError.stack : undefined,
              attemptedStatus: analysis.orderStatus
            });
            // Don't throw - we still want to create history entry even if status update fails
          }
        } else {
          logger.verbose('No status update needed', {
            orderId,
            shouldUpdateStatus: analysis.shouldUpdateStatus,
            orderStatus: analysis.orderStatus,
            currentStatus: order.status,
            reason: !analysis.shouldUpdateStatus ? 'shouldUpdateStatus is false' : !analysis.orderStatus ? 'orderStatus is undefined' : 'unknown'
          });
        }

        // Create order history
        await orderHistoryService.createOrderHistory({
          orderId,
          type: 'RESPONSE_RECEIVED',
          aiSummary: analysis.summary,
          context: {
            channel: 'EMAIL',
            messageId: callback.messageId,
            timestamp: callback.timestamp
          },
          metadata: {
            analysis,
            replyContent: callback.response
          }
        });

        // Update follow-up with reply
        await prisma.followUp.update({
          where: { id: followUpId },
          data: {
            response: callback.response,
            success: true
          }
        });
      } catch (error) {
        logger.error('Failed to handle email reply', { error, orderId });
      }
    },

    /**
     * Handle SMS reply
     */
    async handleSmsReply(
      callback: ChannelCallback,
      orderId: string,
      _followUpId: string
    ): Promise<void> {
      // TODO: Implement SMS reply handling
      logger.info('SMS reply received', { orderId, messageId: callback.messageId });
    },

    /**
     * Handle Voice reply
     */
    async handleVoiceReply(
      callback: ChannelCallback,
      orderId: string,
      _followUpId: string
    ): Promise<void> {
      // TODO: Implement Voice reply handling
      logger.info('Voice reply received', { orderId, messageId: callback.messageId });
    },

    /**
     * Extract email structure from callback metadata
     */
    extractEmailFromCallback(callback: ChannelCallback) {
      const metadata = callback.metadata || {};
      
      // Extract reply content - prefer response field, fallback to metadata
      const replyText = callback.response || (metadata['text'] as string) || '';
      const replyHtml = metadata['html'] as string || undefined;
      
      // Extract 'to' field - handle both array and string formats
      let toEmails: string[] = [];
      const toField = metadata['to'];
      if (Array.isArray(toField)) {
        toEmails = toField as string[];
      } else if (typeof toField === 'string') {
        toEmails = [toField];
      }

      return {
        messageId: callback.messageId,
        from: (metadata['from'] as string) || '',
        to: toEmails,
        subject: (metadata['subject'] as string) || '',
        text: replyText,
        html: replyHtml,
        headers: {},
        timestamp: callback.timestamp
      };
    }
  };

  return handler;
}

