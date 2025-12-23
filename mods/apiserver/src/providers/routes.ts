import { Router } from 'express';
import type { ProviderHandlers } from './handlers';

export function createProviderRoutes(
  handlers: ReturnType<ProviderHandlers>
): Router {
  const router = Router();

  router.post('/', handlers.createProvider);
  router.get('/', handlers.listProviders);
  router.get('/:id', handlers.getProvider);
  router.put('/:id', handlers.updateProvider);
  router.delete('/:id', handlers.deleteProvider);

  return router;
}

