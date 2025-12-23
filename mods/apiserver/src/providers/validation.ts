import { z } from 'zod';

const contactInfoSchema = z.object({
  SMS: z.string().optional(),
  EMAIL: z.string().email().optional(),
  VOICE: z.string().optional()
}).refine(
  (data) => data.SMS || data.EMAIL || data.VOICE,
  {
    message: 'At least one contact method (SMS, EMAIL, or VOICE) is required'
  }
);

export const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  country: z.string().optional(),
  preferredChannel: z.enum(['SMS', 'EMAIL', 'VOICE']).optional(),
  contactInfo: contactInfoSchema
});

export const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  country: z.string().optional().nullable(),
  preferredChannel: z.enum(['SMS', 'EMAIL', 'VOICE']).optional(),
  contactInfo: contactInfoSchema.optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const listProvidersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

