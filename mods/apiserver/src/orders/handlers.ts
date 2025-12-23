import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@outlast/common';
import type { createOrderService } from './order-service';
import {
  createOrderSchema,
  updateOrderSchema,
  listOrdersQuerySchema
} from './validation';

interface OrderHandlersDependencies {
  orderService: ReturnType<typeof createOrderService>;
}

export type OrderHandlers = typeof createOrderHandlers;

export function createOrderHandlers(
  dependencies: OrderHandlersDependencies
) {
  const { orderService } = dependencies;

  return {
    async createOrder(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const validated = createOrderSchema.parse(req.body);
        const order = await orderService.createOrder(validated);
        res.status(201).json(order);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid request data', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async getOrder(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        const order = await orderService.getOrder(id);
        res.json(order);
      } catch (error) {
        next(error);
      }
    },

    async getOrderByOrderId(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { orderId } = req.params;
        const order = await orderService.getOrderByOrderId(orderId);
        res.json(order);
      } catch (error) {
        next(error);
      }
    },

    async listOrders(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const query = listOrdersQuerySchema.parse(req.query);
        const result = await orderService.listOrders(query);
        res.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid query parameters', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async updateOrder(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        const validated = updateOrderSchema.parse(req.body);
        const order = await orderService.updateOrder(id, validated);
        res.json(order);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid request data', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async deleteOrder(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        await orderService.deleteOrder(id);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  };
}

