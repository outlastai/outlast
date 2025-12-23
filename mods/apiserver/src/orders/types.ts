import type { OrderStatus, OrderPriority } from '../types/enums';

export interface CreateOrderRequest {
  orderId: string;
  partName: string;
  componentDescription?: string;
  subSystem?: string;
  providerId: string;
  status?: OrderStatus;
  orderedDate?: Date;
  expectedDeliveryDate?: Date;
  leadTimeWeeks?: number;
  priority?: OrderPriority;
}

export interface UpdateOrderRequest {
  partName?: string;
  componentDescription?: string | null;
  subSystem?: string | null;
  status?: OrderStatus;
  orderedDate?: Date | null;
  expectedDeliveryDate?: Date | null;
  leadTimeWeeks?: number | null;
  priority?: OrderPriority | null;
}

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
  status: OrderStatus;
  orderedDate: Date | null;
  expectedDeliveryDate: Date | null;
  leadTimeWeeks: number | null;
  priority: OrderPriority | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListOrdersQuery {
  limit?: number;
  offset?: number;
  status?: OrderStatus;
  providerId?: string;
}

export interface ListOrdersResponse {
  items: OrderResponse[];
  totalCount: number;
  limit: number;
  offset: number;
}

