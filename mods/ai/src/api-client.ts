// Type definitions matching the API server types
// These are kept in sync with the apiserver module

export interface OrderResponse {
  id: string;
  orderId: string;
  partName: string;
  componentDescription: string | null;
  subSystem: string | null;
  providerId: string;
  provider: {
    id: string;
    name: string;
    preferredChannel: string;
  };
  status: string;
  orderedDate: Date | null;
  expectedDeliveryDate: Date | null;
  leadTimeWeeks: number | null;
  priority: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderHistoryRequest {
  orderId: string;
  type: string;
  aiSummary?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  rawData?: Record<string, unknown>;
  conversationTurn?: number;
}

export interface OrderHistoryResponse {
  id: string;
  orderId: string;
  type: string;
  timestamp: Date;
  aiSummary: string | null;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  rawData: Record<string, unknown> | null;
  conversationTurn: number | null;
}

export interface ListOrderHistoryResponse {
  items: OrderHistoryResponse[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface ListOrdersResponse {
  items: OrderResponse[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface SendFollowUpRequest {
  orderId: string;
  channel: 'SMS' | 'EMAIL' | 'VOICE';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendFollowUpResponse {
  followUpId: string;
  messageId: string;
  channel: 'SMS' | 'EMAIL' | 'VOICE';
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: Date;
  error?: string;
}

/**
 * API Client for communicating with the OutLast API server
 * This wraps the REST API calls that the agent will use as tools
 */
export interface ApiClient {
  getOrder(orderId: string): Promise<OrderResponse>;
  getOrderByExternalId(externalOrderId: string): Promise<OrderResponse>;
  listOrders(filters?: {
    status?: string;
    providerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListOrdersResponse>;
  updateOrderStatus(orderId: string, status: string): Promise<OrderResponse>;
  getOrderHistory(orderId: string, limit?: number): Promise<ListOrderHistoryResponse>;
  createOrderHistory(history: CreateOrderHistoryRequest): Promise<OrderHistoryResponse>;
  sendFollowUp(data: SendFollowUpRequest): Promise<SendFollowUpResponse>;
}

export function createApiClient(baseUrl: string = 'http://localhost:3000'): ApiClient {
  const apiUrl = (path: string) => `${baseUrl}${path}`;

  return {
    async getOrder(orderId: string): Promise<OrderResponse> {
      const response = await fetch(apiUrl(`/api/orders/${orderId}`));
      if (!response.ok) {
        throw new Error(`Failed to get order: ${response.statusText}`);
      }
      return response.json() as Promise<OrderResponse>;
    },

    async getOrderByExternalId(externalOrderId: string): Promise<OrderResponse> {
      const response = await fetch(apiUrl(`/api/orders/by-order-id/${externalOrderId}`));
      if (!response.ok) {
        throw new Error(`Failed to get order: ${response.statusText}`);
      }
      return response.json() as Promise<OrderResponse>;
    },

    async listOrders(filters = {}): Promise<ListOrdersResponse> {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.providerId) params.append('providerId', filters.providerId);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(apiUrl(`/api/orders?${params.toString()}`));
      if (!response.ok) {
        throw new Error(`Failed to list orders: ${response.statusText}`);
      }
      return response.json() as Promise<ListOrdersResponse>;
    },

    async updateOrderStatus(orderId: string, status: string): Promise<OrderResponse> {
      const response = await fetch(apiUrl(`/api/orders/${orderId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error(`Failed to update order: ${response.statusText}`);
      }
      return response.json() as Promise<OrderResponse>;
    },

    async getOrderHistory(orderId: string, limit = 50): Promise<ListOrderHistoryResponse> {
      const params = new URLSearchParams();
      params.append('orderId', orderId);
      params.append('limit', limit.toString());

      const response = await fetch(apiUrl(`/api/order-history?${params.toString()}`));
      if (!response.ok) {
        throw new Error(`Failed to get order history: ${response.statusText}`);
      }
      return response.json() as Promise<ListOrderHistoryResponse>;
    },

    async createOrderHistory(history: CreateOrderHistoryRequest): Promise<OrderHistoryResponse> {
      const response = await fetch(apiUrl('/api/order-history'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(history)
      });
      if (!response.ok) {
        throw new Error(`Failed to create order history: ${response.statusText}`);
      }
      return response.json() as Promise<OrderHistoryResponse>;
    },

    async sendFollowUp(data: SendFollowUpRequest): Promise<SendFollowUpResponse> {
      const response = await fetch(apiUrl('/api/follow-ups'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`Failed to send follow-up: ${response.statusText}`);
      }
      return response.json() as Promise<SendFollowUpResponse>;
    }
  };
}

