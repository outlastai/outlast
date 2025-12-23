import { z } from 'zod';

export const createOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  partName: z.string().min(1, 'Part name is required'),
  componentDescription: z.string().optional(),
  subSystem: z.string().optional(),
  providerId: z.string().uuid('Provider ID must be a valid UUID'),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED']).optional(),
  orderedDate: z.coerce.date().optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
  leadTimeWeeks: z.coerce.number().int().positive().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional()
});

export const updateOrderSchema = z.object({
  partName: z.string().min(1).optional(),
  componentDescription: z.string().optional().nullable(),
  subSystem: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED']).optional(),
  orderedDate: z.coerce.date().optional().nullable(),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  leadTimeWeeks: z.coerce.number().int().positive().optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional().nullable()
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update'
  }
);

export const listOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED']).optional(),
  providerId: z.string().uuid().optional()
});

