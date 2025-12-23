import { PrismaClient, Order } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError } from '@outlast/common';
import type {
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderResponse,
  ListOrdersQuery,
  ListOrdersResponse
} from './types';
import type { OrderStatus, OrderPriority } from '../types/enums';

interface OrderServiceDependencies {
  prisma: PrismaClient;
  logger: ReturnType<typeof getLogger>;
}

function mapOrderToResponse(order: Order & { provider: { id: string; name: string; preferredChannel: string } }): OrderResponse {
  return {
    id: order.id,
    orderId: order.orderId,
    partName: order.partName,
    componentDescription: order.componentDescription,
    subSystem: order.subSystem,
    providerId: order.providerId,
    provider: {
      id: order.provider.id,
      name: order.provider.name,
      preferredChannel: order.provider.preferredChannel
    },
    status: order.status as OrderStatus,
    orderedDate: order.orderedDate,
    expectedDeliveryDate: order.expectedDeliveryDate,
    leadTimeWeeks: order.leadTimeWeeks,
    priority: order.priority as OrderPriority | null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

export function createOrderService(
  dependencies: OrderServiceDependencies
) {
  const { prisma, logger } = dependencies;

  return {
    async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
      logger.info('Creating order', { orderId: data.orderId, providerId: data.providerId });

      // Verify provider exists
      const provider = await prisma.provider.findUnique({
        where: { id: data.providerId }
      });

      if (!provider) {
        throw new NotFoundError('Provider', data.providerId);
      }

      const order = await prisma.order.create({
        data: {
          orderId: data.orderId,
          partName: data.partName,
          componentDescription: data.componentDescription,
          subSystem: data.subSystem,
          providerId: data.providerId,
          status: data.status || 'PENDING',
          orderedDate: data.orderedDate,
          expectedDeliveryDate: data.expectedDeliveryDate,
          leadTimeWeeks: data.leadTimeWeeks,
          priority: data.priority || 'NORMAL'
        },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          }
        }
      });

      logger.info('Order created', { orderId: order.id, orderIdExternal: order.orderId });
      return mapOrderToResponse(order);
    },

    async getOrder(id: string): Promise<OrderResponse> {
      logger.verbose('Getting order', { orderId: id });

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          }
        }
      });

      if (!order) {
        throw new NotFoundError('Order', id);
      }

      return mapOrderToResponse(order);
    },

    async getOrderByOrderId(orderId: string): Promise<OrderResponse> {
      logger.verbose('Getting order by orderId', { orderId });

      const order = await prisma.order.findUnique({
        where: { orderId },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          }
        }
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      return mapOrderToResponse(order);
    },

    async listOrders(query: ListOrdersQuery = {}): Promise<ListOrdersResponse> {
      const limit = Math.min(query.limit || 50, 100);
      const offset = query.offset || 0;

      logger.verbose('Listing orders', { limit, offset, status: query.status, providerId: query.providerId });

      const where: any = {};
      if (query.status) {
        where.status = query.status;
      }
      if (query.providerId) {
        where.providerId = query.providerId;
      }

      const [items, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                preferredChannel: true
              }
            }
          }
        }),
        prisma.order.count({ where })
      ]);

      return {
        items: items.map(mapOrderToResponse),
        totalCount,
        limit,
        offset
      };
    },

    async updateOrder(id: string, data: UpdateOrderRequest): Promise<OrderResponse> {
      logger.info('Updating order', { orderId: id });

      const existing = await prisma.order.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new NotFoundError('Order', id);
      }

      const order = await prisma.order.update({
        where: { id },
        data: {
          partName: data.partName,
          componentDescription: data.componentDescription,
          subSystem: data.subSystem,
          status: data.status,
          orderedDate: data.orderedDate,
          expectedDeliveryDate: data.expectedDeliveryDate,
          leadTimeWeeks: data.leadTimeWeeks,
          priority: data.priority
        },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          }
        }
      });

      logger.info('Order updated', { orderId: id });
      return mapOrderToResponse(order);
    },

    async deleteOrder(id: string): Promise<void> {
      logger.info('Deleting order', { orderId: id });

      const existing = await prisma.order.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new NotFoundError('Order', id);
      }

      await prisma.order.delete({
        where: { id }
      });

      logger.info('Order deleted', { orderId: id });
    }
  };
}

