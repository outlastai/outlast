import { z } from 'zod';

export const createOrderHistorySchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  type: z.enum([
    'AI_ANALYSIS',
    'FOLLOW_UP_SENT',
    'RESPONSE_RECEIVED',
    'STATUS_UPDATE',
    'MANUAL_ENTRY',
    'SYSTEM_EVENT'
  ]),
  aiSummary: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  rawData: z.record(z.unknown()).optional(),
  conversationTurn: z.number().int().positive().optional()
});

export const listOrderHistoryQuerySchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  type: z.enum([
    'AI_ANALYSIS',
    'FOLLOW_UP_SENT',
    'RESPONSE_RECEIVED',
    'STATUS_UPDATE',
    'MANUAL_ENTRY',
    'SYSTEM_EVENT'
  ]).optional(),
  conversationTurn: z.coerce.number().int().positive().optional()
});

