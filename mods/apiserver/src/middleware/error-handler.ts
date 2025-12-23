import { Request, Response, NextFunction } from 'express';
import { OutLastError } from '@outlast/common';
import { getLogger } from '@outlast/logger';

export function createErrorHandler(logger: ReturnType<typeof getLogger>) {
  return (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    if (error instanceof OutLastError) {
      const statusCode = error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
      return;
    }

    logger.error('Unexpected error', { error });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  };
}

