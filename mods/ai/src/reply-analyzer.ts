import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { getLogger } from '@outlast/logger';
import type { AgentConfig } from './types';

// Types for email reply analysis
interface InboundEmail {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  headers: Record<string, string>;
  timestamp: Date;
}

interface ReplyAnalysis {
  orderStatus?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';
  expectedDeliveryDate?: Date;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  summary: string;
  keyPoints: string[];
  shouldUpdateStatus: boolean;
  confidence: number;
  rawAnalysis?: string;
  reason?: string; // Reason for delay (if status is DELAYED)
}

interface ReplyAnalyzerServiceDependencies {
  config: AgentConfig;
  logger: ReturnType<typeof getLogger>;
}

/**
 * AI service for analyzing email replies
 * Uses LLM to extract order status updates, delivery dates, and key information
 */
export function createReplyAnalyzerService(
  dependencies: ReplyAnalyzerServiceDependencies
) {
  const { config, logger } = dependencies;

  // Initialize the LLM
  const llm = new ChatOpenAI({
    modelName: config.model || 'gpt-4',
    temperature: config.temperature || 0.3, // Lower temperature for more consistent analysis
    openAIApiKey: config.apiKey
  });

  /**
   * System prompt for reply analysis
   */
  const SYSTEM_PROMPT = `You are an AI assistant that analyzes email replies from logistics providers about order status updates.

Your task is to analyze the email reply and extract:
1. Order status update (PENDING, IN_TRANSIT, DELIVERED, DELAYED, or CANCELLED)
2. New expected delivery date (if mentioned)
3. Priority change (if mentioned)
4. A clear summary of the reply
5. Key information points
6. Reason for delay (if status is DELAYED)

Important guidelines:
- Focus on the ACTUAL REPLY CONTENT, not quoted/forwarded text from the original message
- If the reply indicates a delay (e.g., "going to be delayed", "will be delayed", "delayed for one week"), set status to DELAYED (NOT IN_TRANSIT)
- DELAYED status takes priority over IN_TRANSIT - if there's any mention of delay, it's DELAYED
- IN_TRANSIT should only be used when the order is actively shipping/moving without delays
- Only extract dates that are explicitly mentioned as new delivery dates
- Be conservative with confidence scores - only set shouldUpdateStatus to true if you're confident
- If the status is DELAYED, extract the reason for the delay (e.g., "supply chain issue", "manufacturing delay", "shipping problem", etc.). If no reason is provided, set reason to null.
- Return your analysis as JSON with the following structure:
  {
    "orderStatus": "DELAYED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "PENDING" | null,
    "expectedDeliveryDate": "YYYY-MM-DD" | null,
    "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT" | null,
    "summary": "Brief summary of the reply",
    "keyPoints": ["point 1", "point 2"],
    "shouldUpdateStatus": true | false,
    "confidence": 0.0-1.0,
    "reason": "reason for delay" | null
  }

If the reply doesn't contain any status update information, set shouldUpdateStatus to false and orderStatus to null.`;

  /**
   * Analyze email reply using AI
   */
  async function analyzeReply(
    email: InboundEmail,
    orderContext?: Record<string, unknown>
  ): Promise<ReplyAnalysis> {
    logger.info('Starting AI reply analysis', {
      from: email.from,
      subject: email.subject,
      messageId: email.messageId,
      hasText: !!email.text,
      textLength: email.text?.length || 0
    });

    // Extract reply content (remove quoted text if possible)
    const replyText = email.text || email.html || '';
    
    // Build context string
    const contextString = orderContext
      ? '\n\nOrder Context:\n- Order ID: ' + (orderContext.orderId || 'N/A') +
        '\n- Current Status: ' + (orderContext.status || 'N/A') +
        '\n- Expected Delivery: ' + (orderContext.expectedDeliveryDate || 'N/A') +
        '\n- Priority: ' + (orderContext.priority || 'N/A') +
        '\n- Provider: ' + (orderContext.providerName || 'N/A')
      : '';

    // Build the human message (using string concatenation to avoid LangChain template variable issues)
    const humanMessageText = 'Analyze this email reply from a logistics provider:\n\n' +
      'From: ' + email.from + '\n' +
      'Subject: ' + email.subject + '\n' +
      'Date: ' + email.timestamp.toISOString() + contextString + '\n\n' +
      'Reply Content:\n' +
      replyText + '\n\n' +
      'Extract the order status update and key information. Return your analysis as JSON.';

    // Use message classes directly instead of ChatPromptTemplate to avoid template variable parsing
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(humanMessageText)
    ];

    try {
      const response = await llm.invoke(messages);
      const content = response.content as string;

      logger.verbose('AI reply analysis response', {
        contentLength: content.length,
        contentPreview: content.substring(0, 200)
      });

      // Parse JSON from response
      // The LLM might return JSON wrapped in markdown code blocks
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(jsonContent) as {
        orderStatus?: string | null;
        expectedDeliveryDate?: string | null;
        priority?: string | null;
        summary: string;
        keyPoints: string[];
        shouldUpdateStatus: boolean;
        confidence: number;
        reason?: string | null;
      };

      // Convert expectedDeliveryDate string to Date if provided
      let expectedDeliveryDate: Date | undefined;
      if (parsed.expectedDeliveryDate) {
        try {
          expectedDeliveryDate = new Date(parsed.expectedDeliveryDate);
          if (isNaN(expectedDeliveryDate.getTime())) {
            expectedDeliveryDate = undefined;
          }
        } catch {
          // Invalid date, ignore
        }
      }

      const result: ReplyAnalysis = {
        orderStatus: parsed.orderStatus as ReplyAnalysis['orderStatus'] | undefined,
        expectedDeliveryDate,
        priority: parsed.priority as ReplyAnalysis['priority'] | undefined,
        summary: parsed.summary || replyText.substring(0, 200),
        keyPoints: parsed.keyPoints || [],
        shouldUpdateStatus: parsed.shouldUpdateStatus || false,
        confidence: parsed.confidence || 0.5,
        reason: parsed.reason || undefined,
        rawAnalysis: content
      };

      logger.info('AI reply analysis completed', {
        orderStatus: result.orderStatus,
        shouldUpdateStatus: result.shouldUpdateStatus,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('AI reply analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  return {
    analyzeReply
  };
}
