import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@outlast/common';
import type { createFollowUpService } from './follow-up-service';
import { sendFollowUpSchema } from './validation';

interface FollowUpHandlersDependencies {
  followUpService: ReturnType<typeof createFollowUpService>;
}

export type FollowUpHandlers = typeof createFollowUpHandlers;

export function createFollowUpHandlers(
  dependencies: FollowUpHandlersDependencies
) {
  const { followUpService } = dependencies;

  return {
    async sendFollowUp(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const validated = sendFollowUpSchema.parse(req.body);
        const result = await followUpService.sendFollowUp(validated);
        res.status(201).json(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          next(new ValidationError('Invalid request data', { errors: error.errors }));
        } else {
          next(error);
        }
      }
    }
  };
}

