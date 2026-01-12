import { Router } from 'express';
import type { VoiceHandlers } from './handlers';

export function createVoiceRoutes(
  handlers: ReturnType<VoiceHandlers>
): Router {
  const router = Router();

  router.post('/', handlers.createCall);

  return router;
}
