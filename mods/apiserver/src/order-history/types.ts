import type { OrderHistoryType } from '../types/enums';

export interface CreateOrderHistoryRequest {
  orderId: string;
  type: OrderHistoryType;
  aiSummary?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  rawData?: Record<string, unknown>;
  conversationTurn?: number;
}

export interface OrderHistoryResponse {
  id: string;
  orderId: string;
  type: OrderHistoryType;
  timestamp: Date;
  aiSummary: string | null;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  rawData: Record<string, unknown> | null;
  conversationTurn: number | null;
}

export interface ListOrderHistoryQuery {
  orderId: string;
  limit?: number;
  offset?: number;
  type?: OrderHistoryType;
  conversationTurn?: number;
}

export interface ListOrderHistoryResponse {
  items: OrderHistoryResponse[];
  totalCount: number;
  limit: number;
  offset: number;
}

