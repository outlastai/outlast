import { Router } from 'express';
import type { OrderHistoryHandlers } from './handlers';

export function createOrderHistoryRoutes(
  handlers: ReturnType<OrderHistoryHandlers>
): Router {
  const router = Router();

  router.post('/', handlers.createOrderHistory);
  router.get('/', handlers.listOrderHistory);
  router.get('/:id', handlers.getOrderHistory);

  return router;
}

