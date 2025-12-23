import { Router } from 'express';
import type { FollowUpHandlers } from './handlers';

export function createFollowUpRoutes(
  handlers: ReturnType<FollowUpHandlers>
): Router {
  const router = Router();

  router.post('/', handlers.sendFollowUp);

  return router;
}

