// Type definitions for the AI module
// These match the enums in apiserver but are defined here for independence

export type OrderStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';
export type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type OrderHistoryType =
  | 'AI_ANALYSIS'
  | 'FOLLOW_UP_SENT'
  | 'RESPONSE_RECEIVED'
  | 'STATUS_UPDATE'
  | 'MANUAL_ENTRY'
  | 'SYSTEM_EVENT';
export type CommunicationChannel = 'SMS' | 'EMAIL' | 'VOICE';

export interface AgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  apiBaseUrl?: string;
}

export interface OrderAnalysis {
  orderId: string;
  shouldFollowUp: boolean;
  recommendedChannel?: CommunicationChannel;
  recommendedMessage?: string;
  confidence: number;
  reasoning: string;
  daysSinceLastUpdate: number;
  followUpCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FollowUpDecision {
  shouldFollowUp: boolean;
  channel: CommunicationChannel;
  message: string;
  priority: OrderPriority;
  reasoning: string;
}

export interface OrderContext {
  order: {
    id: string;
    orderId: string;
    partName: string;
    status: OrderStatus;
    priority: OrderPriority | null;
    expectedDeliveryDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  provider: {
    id: string;
    name: string;
    preferredChannel: CommunicationChannel;
  };
  history: Array<{
    type: OrderHistoryType;
    timestamp: Date;
    aiSummary: string | null;
    context: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    conversationTurn: number | null;
  }>;
  followUps: Array<{
    channel: CommunicationChannel;
    message: string;
    success: boolean;
    timestamp: Date;
    attemptNumber: number;
    response: string | null;
  }>;
}

