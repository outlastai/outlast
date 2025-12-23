import { z } from 'zod';

export const sendFollowUpSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
  channel: z.enum(['SMS', 'EMAIL', 'VOICE']),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.unknown()).optional()
});

