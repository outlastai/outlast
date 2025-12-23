import type { CommunicationChannel } from '../types/enums';

export interface SendFollowUpRequest {
  orderId: string;
  channel: CommunicationChannel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendFollowUpResponse {
  followUpId: string;
  messageId: string;
  channel: CommunicationChannel;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: Date;
  error?: string;
}

