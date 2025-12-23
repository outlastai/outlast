import { Router } from 'express';
import type { OrderHandlers } from './handlers';

export function createOrderRoutes(
  handlers: ReturnType<OrderHandlers>
): Router {
  const router = Router();

  router.post('/', handlers.createOrder);
  router.get('/', handlers.listOrders);
  router.get('/by-order-id/:orderId', handlers.getOrderByOrderId);
  router.get('/:id', handlers.getOrder);
  router.put('/:id', handlers.updateOrder);
  router.delete('/:id', handlers.deleteOrder);

  return router;
}

