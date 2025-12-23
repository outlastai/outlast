import type { CommunicationChannel } from '../types/enums';

/**
 * Base interface for all channel messages
 */
export interface ChannelMessage {
  orderId: string;
  providerId: string;
  channel: CommunicationChannel;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response from channel after sending a message
 * This is the immediate response (message queued, not delivered yet)
 */
export interface ChannelSendResponse {
  messageId: string;
  channel: CommunicationChannel;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: Date;
  error?: string;
}

/**
 * Async callback when a message delivery status changes
 */
export interface ChannelCallback {
  messageId: string;
  channel: CommunicationChannel;
  status: 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'READ' | 'REPLIED';
  timestamp: Date;
  response?: string; // For replies
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Channel job for async processing
 */
export interface ChannelJob {
  id: string;
  orderId: string;
  providerId: string;
  channel: CommunicationChannel;
  message: string;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'FAILED';
  messageId?: string; // External message ID from channel provider
  attemptNumber: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  deliveredAt?: Date;
  error?: string;
  response?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Channel service interface that all channel implementations must follow
 */
export interface ChannelService {
  /**
   * Get the channel type this service handles
   */
  getChannelType(): CommunicationChannel;

  /**
   * Send a message asynchronously
   * Returns immediately with a job ID, actual sending happens async
   */
  sendMessage(message: ChannelMessage): Promise<ChannelSendResponse>;

  /**
   * Process a callback/webhook from the channel provider
   * This is called when the channel provider notifies us of status changes
   */
  processCallback(callback: ChannelCallback): Promise<void>;
}

/**
 * Configuration for channel services
 */
export interface ChannelConfig {
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  timeout?: number; // milliseconds
  webhookUrl?: string; // URL for channel providers to send callbacks
}

