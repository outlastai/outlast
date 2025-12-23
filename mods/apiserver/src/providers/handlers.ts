import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getLogger } from '@outlast/logger';
import { ValidationError } from '@outlast/common';
import type { createProviderService } from './provider-service';
import {
  createProviderSchema,
  updateProviderSchema,
  listProvidersQuerySchema
} from './validation';

interface ProviderHandlersDependencies {
  providerService: ReturnType<typeof createProviderService>;
  logger: ReturnType<typeof getLogger>;
}

export type ProviderHandlers = typeof createProviderHandlers;

export function createProviderHandlers(
  dependencies: ProviderHandlersDependencies
) {
  const { providerService } = dependencies;

  return {
    async createProvider(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const validated = createProviderSchema.parse(req.body);
        const provider = await providerService.createProvider(validated);
        res.status(201).json(provider);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid request data', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async getProvider(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        const provider = await providerService.getProvider(id);
        res.json(provider);
      } catch (error) {
        next(error);
      }
    },

    async listProviders(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const query = listProvidersQuerySchema.parse(req.query);
        const result = await providerService.listProviders(query);
        res.json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid query parameters', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async updateProvider(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        const validated = updateProviderSchema.parse(req.body);
        const provider = await providerService.updateProvider(id, validated);
        res.json(provider);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid request data', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    },

    async deleteProvider(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const { id } = req.params;
        await providerService.deleteProvider(id);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  };
}

