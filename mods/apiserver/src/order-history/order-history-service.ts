import { PrismaClient, OrderHistory } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError } from '@outlast/common';
import type {
  CreateOrderHistoryRequest,
  OrderHistoryResponse,
  ListOrderHistoryQuery,
  ListOrderHistoryResponse
} from './types';
import type { OrderHistoryType } from '../types/enums';

interface OrderHistoryServiceDependencies {
  prisma: PrismaClient;
  logger: ReturnType<typeof getLogger>;
}

function mapOrderHistoryToResponse(history: OrderHistory): OrderHistoryResponse {
  return {
    id: history.id,
    orderId: history.orderId,
    type: history.type as OrderHistoryType,
    timestamp: history.timestamp,
    aiSummary: history.aiSummary,
    context: history.context ? JSON.parse(history.context) : null,
    metadata: history.metadata ? JSON.parse(history.metadata) : null,
    rawData: history.rawData ? JSON.parse(history.rawData) : null,
    conversationTurn: history.conversationTurn
  };
}

export function createOrderHistoryService(
  dependencies: OrderHistoryServiceDependencies
) {
  const { prisma, logger } = dependencies;

  return {
    async createOrderHistory(
      data: CreateOrderHistoryRequest
    ): Promise<OrderHistoryResponse> {
      logger.info('Creating order history', { orderId: data.orderId, type: data.type });

      // Verify order exists
      const order = await prisma.order.findUnique({
        where: { id: data.orderId }
      });

      if (!order) {
        throw new NotFoundError('Order', data.orderId);
      }

      // If conversationTurn is not provided, get the next turn number
      let conversationTurn = data.conversationTurn;
      if (conversationTurn === undefined) {
        const lastHistory = await prisma.orderHistory.findFirst({
          where: { orderId: data.orderId },
          orderBy: { conversationTurn: 'desc' }
        });
        conversationTurn = lastHistory?.conversationTurn
          ? lastHistory.conversationTurn + 1
          : 1;
      }

      const history = await prisma.orderHistory.create({
        data: {
          orderId: data.orderId,
          type: data.type,
          aiSummary: data.aiSummary,
          context: data.context ? JSON.stringify(data.context) : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          rawData: data.rawData ? JSON.stringify(data.rawData) : null,
          conversationTurn
        }
      });

      logger.info('Order history created', { historyId: history.id, orderId: data.orderId });
      return mapOrderHistoryToResponse(history);
    },

    async getOrderHistory(id: string): Promise<OrderHistoryResponse> {
      logger.verbose('Getting order history', { historyId: id });

      const history = await prisma.orderHistory.findUnique({
        where: { id }
      });

      if (!history) {
        throw new NotFoundError('OrderHistory', id);
      }

      return mapOrderHistoryToResponse(history);
    },

    async listOrderHistory(
      query: ListOrderHistoryQuery
    ): Promise<ListOrderHistoryResponse> {
      const limit = Math.min(query.limit || 50, 100);
      const offset = query.offset || 0;

      logger.verbose('Listing order history', {
        orderId: query.orderId,
        limit,
        offset,
        type: query.type
      });

      // Verify order exists
      const order = await prisma.order.findUnique({
        where: { id: query.orderId }
      });

      if (!order) {
        throw new NotFoundError('Order', query.orderId);
      }

      const where: any = {
        orderId: query.orderId
      };

      if (query.type) {
        where.type = query.type;
      }

      if (query.conversationTurn !== undefined) {
        where.conversationTurn = query.conversationTurn;
      }

      const [items, totalCount] = await Promise.all([
        prisma.orderHistory.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [
            { conversationTurn: 'asc' },
            { timestamp: 'asc' }
          ]
        }),
        prisma.orderHistory.count({ where })
      ]);

      return {
        items: items.map(mapOrderHistoryToResponse),
        totalCount,
        limit,
        offset
      };
    }
  };
}

