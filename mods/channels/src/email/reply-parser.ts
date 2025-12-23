import { getLogger } from '@outlast/logger';
import type { InboundEmail, ExtractedOrderInfo } from './inbound-types';

interface ReplyParserDependencies {
  logger: ReturnType<typeof getLogger>;
}

/**
 * Service to parse email replies and extract order information
 */
export function createReplyParser(
  dependencies: ReplyParserDependencies
) {
  const { logger } = dependencies;

  return {
    /**
     * Extract order ID from email
     * Tries multiple methods:
     * 1. Subject line (e.g., "Re: Order Update: ORD-12345")
     * 2. In-Reply-To or References headers (to find original message)
     * 3. Body content (search for order ID patterns)
     * 4. Metadata/tags from email provider
     */
    extractOrderInfo(email: InboundEmail): ExtractedOrderInfo {
      logger.info('Extracting order info from email', {
        from: email.from,
        subject: email.subject,
        messageId: email.messageId
      });

      const providerEmail = email.from.toLowerCase().trim();

      // Method 1: Try to extract from subject line
      const subjectOrderId = this.extractOrderIdFromSubject(email.subject);
      if (subjectOrderId) {
        logger.info('Found order ID in subject', { orderId: subjectOrderId, method: 'subject' });
        return {
          orderId: subjectOrderId,
          providerEmail,
          confidence: 0.9,
          extractionMethod: 'subject'
        };
      }

      // Method 2: Try to extract from headers (In-Reply-To, References)
      const headerOrderId = this.extractOrderIdFromHeaders(email.headers);
      if (headerOrderId) {
        logger.info('Found order ID in headers', { orderId: headerOrderId, method: 'headers' });
        return {
          orderId: headerOrderId,
          providerEmail,
          confidence: 0.8,
          extractionMethod: 'headers'
        };
      }

      // Method 3: Try to extract from body
      const bodyText = email.text || this.stripHtml(email.html || '');
      const bodyOrderId = this.extractOrderIdFromBody(bodyText);
      if (bodyOrderId) {
        logger.info('Found order ID in body', { orderId: bodyOrderId, method: 'body' });
        return {
          orderId: bodyOrderId,
          providerEmail,
          confidence: 0.7,
          extractionMethod: 'body'
        };
      }

      logger.warn('Could not extract order ID from email', {
        from: email.from,
        subject: email.subject
      });

      return {
        providerEmail,
        confidence: 0.0,
        extractionMethod: 'metadata'
      };
    },

    /**
     * Extract order ID from subject line
     * Looks for patterns like:
     * - "Re: Order Update: PT-TBL-HYD"
     * - "Re: Order Update: 253e1765-36b8-4816-973b-e49fb1b554ac"
     * - "Order ID: ORD-12345"
     */
    extractOrderIdFromSubject(subject: string): string | null {
      if (!subject) return null;

      // Pattern 1: UUID format
      const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const uuidMatch = subject.match(uuidPattern);
      if (uuidMatch) {
        return uuidMatch[1];
      }

      // Pattern 2: "Order Update: <orderId>" (e.g., "Re: Order Update: PT-TBL-HYD")
      const orderUpdatePattern = /order\s+update\s*:\s*([A-Z0-9-]+)/i;
      const orderUpdateMatch = subject.match(orderUpdatePattern);
      if (orderUpdateMatch) {
        return orderUpdateMatch[1].trim();
      }

      // Pattern 3: Generic order ID format after "Order ID:" or "Order:"
      const orderIdPattern = /(?:order\s*(?:id|#)?\s*:?\s*)([A-Z0-9-]{3,})/i;
      const orderIdMatch = subject.match(orderIdPattern);
      if (orderIdMatch) {
        return orderIdMatch[1].trim();
      }

      return null;
    },

    /**
     * Extract order ID from email headers
     * Checks In-Reply-To and References headers for original message IDs
     * Then tries to extract order ID from those headers
     */
    extractOrderIdFromHeaders(headers: Record<string, string>): string | null {
      // Check In-Reply-To header
      const inReplyTo = headers['in-reply-to'] || headers['In-Reply-To'] || headers['In-Reply-To'];
      if (inReplyTo) {
        const orderId = this.extractOrderIdFromSubject(inReplyTo);
        if (orderId) return orderId;
      }

      // Check References header
      const references = headers['references'] || headers['References'] || headers['REFERENCES'];
      if (references) {
        const orderId = this.extractOrderIdFromSubject(references);
        if (orderId) return orderId;
      }

      // Check X-Original-Message-ID or similar custom headers
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase().includes('order') || key.toLowerCase().includes('message-id')) {
          const orderId = this.extractOrderIdFromSubject(value);
          if (orderId) return orderId;
        }
      }

      return null;
    },

    /**
     * Extract order ID from email body
     * Looks for order ID patterns in the text
     */
    extractOrderIdFromBody(body: string): string | null {
      if (!body) return null;

      // Pattern 1: UUID format
      const uuidPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
      const uuidMatch = body.match(uuidPattern);
      if (uuidMatch) {
        return uuidMatch[1];
      }

      // Pattern 2: Order ID format
      const orderIdPattern = /(?:order\s*(?:id|number|#)?[\s:]*)([A-Z0-9-]{5,})/i;
      const orderIdMatch = body.match(orderIdPattern);
      if (orderIdMatch) {
        return orderIdMatch[1].trim();
      }

      return null;
    },

    /**
     * Strip HTML tags from HTML content
     */
    stripHtml(html: string): string {
      if (!html) return '';
      return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    },

    /**
     * Extract reply content (removes quoted text)
     * This is a simple implementation - could be enhanced with better quote detection
     */
    extractReplyContent(email: InboundEmail): string {
      const text = email.text || this.stripHtml(email.html || '');
      
      // Remove common email quote markers
      const quoteMarkers = [
        /^On .* wrote:.*$/m,
        /^From:.*$/m,
        /^Sent:.*$/m,
        /^To:.*$/m,
        /^Subject:.*$/m,
        /^>.*$/m,
        /^-----Original Message-----.*$/m,
        /^________________________________.*$/m
      ];

      let content = text;
      for (const marker of quoteMarkers) {
        const match = content.match(marker);
        if (match) {
          content = content.substring(0, match.index).trim();
        }
      }

      return content.trim();
    }
  };
}

