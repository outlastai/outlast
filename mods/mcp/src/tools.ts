/**
 * MCP tools that wrap OutLast API endpoints
 */

import { apiClient } from './api-client';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export function registerTools(server: Server) {
  // Tool: List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_orders',
        description: 'Get a list of orders. Can filter by status (PENDING, IN_TRANSIT, DELIVERED, DELAYED, CANCELLED).',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of orders to return (default: 50)',
              minimum: 1,
              maximum: 100,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
              minimum: 0,
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED'],
              description: 'Filter by order status',
            },
          },
        },
      },
      {
        name: 'get_providers',
        description: 'Get a list of providers.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of providers to return (default: 50)',
              minimum: 1,
              maximum: 100,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
              minimum: 0,
            },
          },
        },
      },
      {
        name: 'get_order',
        description: 'Get a specific order by ID (UUID) or orderId (external ID like ORD-123).',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Order UUID',
            },
            orderId: {
              type: 'string',
              description: 'External order ID (e.g., ORD-123)',
            },
          },
        },
      },
      {
        name: 'get_order_history',
        description: `Get the order history (conversation history, AI analysis, etc.) for a specific order.

⚠️ CRITICAL: You MUST format the response as a markdown table. Do NOT return raw JSON.

REQUIRED OUTPUT FORMAT:
Display the order history as a markdown table with exactly these columns:
1. Order ID - Full UUID from the orderId field of each item
2. Type - The type field (e.g., AI_ANALYSIS, RESPONSE_RECEIVED, FOLLOW_UP_SENT, STATUS_UPDATE, etc.)
3. AI Summary - The aiSummary field, truncated to 150 characters if longer (replace newlines with spaces)
4. Status - Fetch the current order status by calling get_order with the orderId, or show "N/A" if unavailable

Table format example:
| Order ID | Type | AI Summary | Status |
|----------|------|------------|--------|
| abc123... | AI_ANALYSIS | Summary text here... | IN_TRANSIT |
| abc123... | RESPONSE_RECEIVED | Another summary... | IN_TRANSIT |

After the table, include: "Total: X items (showing Y, offset: Z)"

If orderId is not provided, ask the user for it before calling this tool.`,
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              description: 'Order UUID',
            },
            limit: {
              type: 'number',
              description: 'Number of history items to return (default: 50)',
              minimum: 1,
              maximum: 100,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination (default: 0)',
              minimum: 0,
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'run_ai_agent',
        description: 'Manually run the AI agent to analyze a specific order and potentially send a follow-up. This bypasses the scheduler and runs immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              description: 'Order UUID to analyze',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'send_follow_up',
        description: 'Manually send a follow-up message for an order without waiting for the scheduler. Requires orderId, channel (EMAIL/SMS/VOICE), and message content.',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              format: 'uuid',
              description: 'Order UUID',
            },
            channel: {
              type: 'string',
              enum: ['EMAIL', 'SMS', 'VOICE'],
              description: 'Communication channel to use',
            },
            message: {
              type: 'string',
              description: 'Message content to send',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata to include with the follow-up',
            },
          },
          required: ['orderId', 'channel', 'message'],
        },
      },
    ],
  }));

  // Tool: Execute tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const params = request.params || {};
    const name = params.name as string;
    const args = (params.arguments || {}) as Record<string, unknown>;

    if (!name) {
      throw new Error('Tool name is required');
    }

    try {
      switch (name) {
        case 'get_orders': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const status = args.status as string | undefined;
          const result = await apiClient.getOrders(limit, offset, status);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_providers': {
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const result = await apiClient.getProviders(limit, offset);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_order': {
          let order;
          if (args.id) {
            order = await apiClient.getOrder(args.id as string);
          } else if (args.orderId) {
            order = await apiClient.getOrderByOrderId(args.orderId as string);
          } else {
            throw new Error('Either id or orderId must be provided');
          }
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(order, null, 2),
              },
            ],
          };
        }

        case 'get_order_history': {
          const orderId = args.orderId as string;
          if (!orderId) {
            throw new Error('orderId is required');
          }
          const limit = (args.limit as number) || 50;
          const offset = (args.offset as number) || 0;
          const result = await apiClient.getOrderHistory(orderId, limit, offset);
          
          // Add formatting reminder in the response
          const responseText = `⚠️ FORMAT AS TABLE: Display this order history as a markdown table with columns: Order ID | Type | AI Summary | Status\n\n` +
            `Raw data:\n${JSON.stringify(result, null, 2)}`;
          
          return {
            content: [
              {
                type: 'text',
                text: responseText,
              },
            ],
          };
        }

        case 'run_ai_agent': {
          const orderId = args.orderId as string;
          if (!orderId) {
            throw new Error('orderId is required');
          }
          const result = await apiClient.processOrder(orderId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'send_follow_up': {
          const orderId = args.orderId as string;
          const channel = args.channel as 'EMAIL' | 'SMS' | 'VOICE';
          const message = args.message as string;
          const metadata = args.metadata as Record<string, unknown> | undefined;

          if (!orderId || !channel || !message) {
            throw new Error('orderId, channel, and message are required');
          }

          const result = await apiClient.sendFollowUp({
            orderId,
            channel,
            message,
            metadata
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });
}
