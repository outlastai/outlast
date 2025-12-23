import { getLogger } from '@outlast/logger';
import type { InboundEmail, ReplyAnalysis } from './inbound-types';

interface ReplyAnalyzerDependencies {
  logger: ReturnType<typeof getLogger>;
  aiService: {
    analyzeReply: (email: InboundEmail, orderContext?: Record<string, unknown>) => Promise<ReplyAnalysis>;
  };
}

/**
 * Service to analyze email replies using AI
 * Extracts order status updates, delivery dates, and other key information
 * 
 * NOTE: This service requires an AI service - no fallback analysis is provided.
 * The AI service must be configured and available for reply analysis to work.
 */
export function createReplyAnalyzer(
  dependencies: ReplyAnalyzerDependencies
) {
  const { logger, aiService } = dependencies;

  if (!aiService) {
    throw new Error('AI service is required for reply analysis. Please configure OPENAI_API_KEY.');
  }

  return {
    /**
     * Analyze email reply to extract order status updates
     * Uses AI to understand the reply content and extract structured information
     */
    async analyzeReply(
      email: InboundEmail,
      orderContext?: Record<string, unknown>
    ): Promise<ReplyAnalysis> {
      logger.info('Analyzing email reply with AI', {
        from: email.from,
        subject: email.subject,
        messageId: email.messageId,
        hasText: !!email.text,
        textLength: email.text?.length || 0
      });

      try {
        const aiResult = await aiService.analyzeReply(email, orderContext);
        logger.info('AI analysis completed', {
          shouldUpdateStatus: aiResult.shouldUpdateStatus,
          orderStatus: aiResult.orderStatus,
          confidence: aiResult.confidence
        });
        return aiResult;
      } catch (error) {
        logger.error('AI analysis failed', { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    }
  };
}

