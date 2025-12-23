import { Router } from 'express';
import type { createSchedulerHandlers } from './handlers';

export function createSchedulerRoutes(
  handlers: ReturnType<typeof createSchedulerHandlers>
): Router {
  const router = Router();

  router.post('/run', handlers.runScheduler);
  router.post('/process-order/:orderId', handlers.processOrder);
  router.get('/config', handlers.getConfig);
  router.get('/status', handlers.getStatus);

  return router;
}

