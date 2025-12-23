/**
 * API client for MCP server to communicate with OutLast API
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface Provider {
  id: string;
  name: string;
  country: string | null;
  preferredChannel: string;
  contactInfo: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
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
  orderedDate: string | null;
  expectedDeliveryDate: string | null;
  leadTimeWeeks: number | null;
  priority: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListResponse<T> {
  items: T[];
  totalCount: number;
  limit: number;
  offset: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: Omit<RequestInit, 'body'> & { body?: unknown }): Promise<T> {
    const { body, ...fetchOptions } = options || {};
    const requestBody = body !== undefined ? JSON.stringify(body) : undefined;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' })) as {
        error?: string | { code?: string; message?: string; details?: unknown };
        [key: string]: unknown;
      };
      
      // Handle error object structure from API error handler
      let errorMessage: string;
      if (errorData?.error) {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error && typeof errorData.error === 'object' && 'message' in errorData.error) {
          errorMessage = errorData.error.message || 'Unknown error';
          if (errorData.error.code) {
            errorMessage = `[${errorData.error.code}] ${errorMessage}`;
          }
        } else {
          errorMessage = JSON.stringify(errorData.error);
        }
      } else {
        errorMessage = `HTTP ${response.status}: ${JSON.stringify(errorData)}`;
      }
      
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  // Providers
  async getProviders(limit = 50, offset = 0): Promise<ListResponse<Provider>> {
    return this.fetch<ListResponse<Provider>>(
      `/api/providers?limit=${limit}&offset=${offset}`
    );
  }

  async getProvider(id: string): Promise<Provider> {
    return this.fetch<Provider>(`/api/providers/${id}`);
  }

  // Orders
  async getOrders(limit = 50, offset = 0, status?: string): Promise<ListResponse<Order>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (status) params.append('status', status);
    
    return this.fetch<ListResponse<Order>>(`/api/orders?${params}`);
  }

  async getOrder(id: string): Promise<Order> {
    return this.fetch<Order>(`/api/orders/${id}`);
  }

  async getOrderByOrderId(orderId: string): Promise<Order> {
    return this.fetch<Order>(`/api/orders/by-order-id/${orderId}`);
  }

  // Order History
  async getOrderHistory(orderId: string, limit = 50, offset = 0): Promise<ListResponse<OrderHistoryItem>> {
    const params = new URLSearchParams({
      orderId,
      limit: limit.toString(),
      offset: offset.toString()
    });
    return this.fetch<ListResponse<OrderHistoryItem>>(`/api/order-history?${params}`);
  }

  // Scheduler - Run AI agent for a specific order
  async processOrder(orderId: string): Promise<ProcessOrderResponse> {
    return this.fetch<ProcessOrderResponse>(`/api/scheduler/process-order/${orderId}`, {
      method: 'POST'
    });
  }

  // Follow-ups - Send a follow-up manually
  async sendFollowUp(data: SendFollowUpRequest): Promise<SendFollowUpResponse> {
    return this.fetch<SendFollowUpResponse>('/api/follow-ups', {
      method: 'POST',
      body: data
    });
  }
}

export interface OrderHistoryItem {
  id: string;
  orderId: string;
  type: string;
  timestamp: string;
  aiSummary: string | null;
  context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  rawData: Record<string, unknown> | null;
  conversationTurn: number;
}

export interface ProcessOrderResponse {
  success: boolean;
  result: {
    orderId: string;
    orderIdExternal: string;
    processed: boolean;
    followUpSent: boolean;
    escalated: boolean;
    skippedReason?: string;
    usedAI?: boolean;
    error?: string;
  };
}

export interface SendFollowUpRequest {
  orderId: string;
  channel: 'EMAIL' | 'SMS' | 'VOICE';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendFollowUpResponse {
  followUpId: string;
  messageId: string | null;
  channel: 'EMAIL' | 'SMS' | 'VOICE';
  status: 'QUEUED' | 'SENT' | 'FAILED';
  queuedAt: string | null;
  error: string | null;
}

export const apiClient = new ApiClient();
