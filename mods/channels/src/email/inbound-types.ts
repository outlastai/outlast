/**
 * Types for inbound email handling (replies)
 * Supports multiple email service providers (Resend, Mailgun, SendGrid, etc.)
 */

/**
 * Generic inbound email event structure
 * Different providers may have different formats, but we normalize to this
 */
export interface InboundEmailEvent {
  /**
   * Provider name (e.g., 'resend', 'mailgun', 'sendgrid')
   */
  provider: string;

  /**
   * Raw event data from provider
   */
  raw: Record<string, unknown>;

  /**
   * Normalized email data
   */
  email: InboundEmail;
}

/**
 * Normalized inbound email structure
 */
export interface InboundEmail {
  /**
   * Message ID from provider
   */
  messageId: string;

  /**
   * From address
   */
  from: string;

  /**
   * From name (if available)
   */
  fromName?: string;

  /**
   * To address(es)
   */
  to: string[];

  /**
   * CC address(es) if any
   */
  cc?: string[];

  /**
   * Subject line
   */
  subject: string;

  /**
   * Plain text body
   */
  text?: string;

  /**
   * HTML body
   */
  html?: string;

  /**
   * Email headers (for finding original message)
   */
  headers: Record<string, string>;

  /**
   * Timestamp when email was received
   */
  timestamp: Date;

  /**
   * Attachments (if any)
   */
  attachments?: InboundEmailAttachment[];
}

/**
 * Email attachment
 */
export interface InboundEmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  url?: string; // URL to download attachment
  content?: string; // Base64 encoded content
}

/**
 * Extracted order information from email
 */
export interface ExtractedOrderInfo {
  /**
   * Order ID found in email (could be UUID or external orderId)
   */
  orderId?: string;

  /**
   * Provider email address
   */
  providerEmail: string;

  /**
   * Confidence level of extraction (0-1)
   */
  confidence: number;

  /**
   * Method used to extract order ID
   */
  extractionMethod: 'subject' | 'headers' | 'body' | 'metadata';
}

/**
 * Reply analysis result from AI
 */
export interface ReplyAnalysis {
  /**
   * Extracted order status update (if any)
   */
  orderStatus?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';

  /**
   * New expected delivery date (if mentioned)
   */
  expectedDeliveryDate?: Date;

  /**
   * Priority change (if mentioned)
   */
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  /**
   * Summary of the reply
   */
  summary: string;

  /**
   * Key information extracted from reply
   */
  keyPoints: string[];

  /**
   * Whether order status should be updated
   */
  shouldUpdateStatus: boolean;

  /**
   * Confidence level (0-1)
   */
  confidence: number;

  /**
   * Raw AI response for debugging
   */
  rawAnalysis?: string;

  /**
   * Reason for delay (if status is DELAYED)
   */
  reason?: string;
}



