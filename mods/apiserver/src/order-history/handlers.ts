import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@outlast/common';
import type { createOrderHistoryService } from './order-history-service';
import {
  createOrderHistorySchema,
  listOrderHistoryQuerySchema
} from './validation';

interface OrderHistoryHandlersDependencies {
  orderHistoryService: ReturnType<typeof createOrderHistoryService>;
}

export type OrderHistoryHandlers = typeof createOrderHistoryHandlers;

export function createOrderHistoryHandlers(
  dependencies: OrderHistoryHandlersDependencies
) {
  const { orderHistoryService } = dependencies;

  return {
    async createOrderHistory(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const validated = createOrderHistorySchema.parse(req.body);
        const history = await orderHistoryService.createOrderHistory(validated);
        res.status(201).json(history);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid request data', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async getOrderHistory(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        const history = await orderHistoryService.getOrderHistory(id);
        res.json(history);
      } catch (error) {
        next(error);
      }
    },

    async listOrderHistory(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const query = listOrderHistoryQuerySchema.parse(req.query);
        const result = await orderHistoryService.listOrderHistory(query);
        res.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid query parameters', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    }
  };
}

