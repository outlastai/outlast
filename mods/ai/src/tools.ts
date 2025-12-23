import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { ApiClient } from './api-client';

interface ToolsDependencies {
  apiClient: ApiClient;
}

/**
 * Create Langchain tools that wrap the API client
 * These tools will be available to the agent
 */
export function createTools(dependencies: ToolsDependencies) {
  const { apiClient } = dependencies;

  return [
    // Tool: Get order by ID
    new DynamicStructuredTool({
      name: 'get_order',
      description: 'Get order details by order ID (UUID). Use this to retrieve full order information including provider details.',
      schema: z.object({
        orderId: z.string().uuid('Order ID must be a valid UUID')
      }),
      func: async ({ orderId }) => {
        const order = await apiClient.getOrder(orderId);
        return JSON.stringify(order, null, 2);
      }
    }),

    // Tool: Get order by external order ID
    new DynamicStructuredTool({
      name: 'get_order_by_external_id',
      description: 'Get order details by external order ID (e.g., ORD-12345). This is the order identifier used in business systems.',
      schema: z.object({
        externalOrderId: z.string().min(1, 'External order ID is required')
      }),
      func: async ({ externalOrderId }) => {
        const order = await apiClient.getOrderByExternalId(externalOrderId);
        return JSON.stringify(order, null, 2);
      }
    }),

    // Tool: List orders with filters
    new DynamicStructuredTool({
      name: 'list_orders',
      description: 'List orders with optional filters. Use this to find orders by status or provider.',
      schema: z.object({
        status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED']).optional(),
        providerId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional()
      }),
      func: async (filters) => {
        const result = await apiClient.listOrders(filters);
        return JSON.stringify(result, null, 2);
      }
    }),

    // Tool: Get order history
    new DynamicStructuredTool({
      name: 'get_order_history',
      description: 'Get the conversation history for an order. This includes AI analysis, follow-ups, and all context. Essential for understanding order status and previous interactions.',
      schema: z.object({
        orderId: z.string().uuid('Order ID must be a valid UUID'),
        limit: z.number().int().min(1).max(100).optional()
      }),
      func: async ({ orderId, limit }) => {
        const history = await apiClient.getOrderHistory(orderId, limit);
        return JSON.stringify(history, null, 2);
      }
    }),

    // Tool: Create order history entry
    new DynamicStructuredTool({
      name: 'create_order_history',
      description: 'Record an order history entry with AI analysis, context, and metadata. Use this to store your analysis, decisions, and reasoning for future reference.',
      schema: z.object({
        orderId: z.string().uuid('Order ID must be a valid UUID'),
        type: z.enum([
          'AI_ANALYSIS',
          'FOLLOW_UP_SENT',
          'RESPONSE_RECEIVED',
          'STATUS_UPDATE',
          'MANUAL_ENTRY',
          'SYSTEM_EVENT'
        ]),
        aiSummary: z.string().optional().describe('AI-generated summary with context for future analysis'),
        context: z.record(z.unknown()).optional().describe('Structured context data (JSON object)'),
        metadata: z.record(z.unknown()).optional().describe('Metadata about tools called, decisions made, etc. (JSON object)'),
        rawData: z.record(z.unknown()).optional().describe('Original data before AI processing (JSON object)'),
        conversationTurn: z.number().int().positive().optional().describe('Conversation turn number (auto-incremented if not provided)')
      }),
      func: async (data) => {
        const history = await apiClient.createOrderHistory(data);
        return JSON.stringify(history, null, 2);
      }
    }),

    // Tool: Update order status
    new DynamicStructuredTool({
      name: 'update_order_status',
      description: 'Update the status of an order. Use this when order status changes (e.g., from PENDING to IN_TRANSIT).',
      schema: z.object({
        orderId: z.string().uuid('Order ID must be a valid UUID'),
        status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED'])
      }),
      func: async ({ orderId, status }) => {
        const order = await apiClient.updateOrderStatus(orderId, status);
        return JSON.stringify(order, null, 2);
      }
    }),

    // Tool: Send follow-up message
    new DynamicStructuredTool({
      name: 'send_follow_up',
      description: 'Send a follow-up message to a provider via their preferred channel (EMAIL, SMS, or VOICE). Use this when you decide a follow-up is needed. The message will be sent asynchronously and delivery status will be tracked.',
      schema: z.object({
        orderId: z.string().uuid('Order ID must be a valid UUID'),
        channel: z.enum(['SMS', 'EMAIL', 'VOICE']).describe('Communication channel to use'),
        message: z.string().min(1, 'Message content is required').describe('The message content to send to the provider'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata for the message')
      }),
      func: async ({ orderId, channel, message, metadata }) => {
        const result = await apiClient.sendFollowUp({
          orderId,
          channel,
          message,
          metadata
        });
        return JSON.stringify(result, null, 2);
      }
    })
  ];
}

