import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '@outlast/common';
import type { createVoiceService } from './voice-service';
import type { VoiceCallRequest } from './types';
import { createVoiceCallSchema } from './validation';

interface VoiceHandlersDependencies {
  voiceService: ReturnType<typeof createVoiceService>;
}

export type VoiceHandlers = typeof createVoiceHandlers;

export function createVoiceHandlers(
  dependencies: VoiceHandlersDependencies
) {
  const { voiceService } = dependencies;

  return {
    async createCall(
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> {
      try {
        const validated = createVoiceCallSchema.parse(req.body) as VoiceCallRequest;
        const result = await voiceService.createCall(validated);
        
        if (result.status === 'FAILED') {
          res.status(500).json(result);
        } else {
          res.status(200).json(result);
        }
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
