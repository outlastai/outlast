#!/usr/bin/env node

/**
 * OutLast MCP Server
 * Exposes OutLast API endpoints as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from './api-client.js';

async function main() {
  try {
    const server = new Server(
      {
        name: 'outlast',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
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
            description: 'Get the order history (conversation history, AI analysis, etc.) for a specific order.',
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
      };
    });

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const params = request.params || ({} as any);
        const name = params.name as string;
        const args = (params.arguments || {}) as Record<string, unknown>;

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
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
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

    // Connect via stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log to stderr (stdio is used for MCP protocol)
    console.error('[OutLast MCP] Server started successfully');
  } catch (error) {
    console.error('[OutLast MCP] Error in main:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[OutLast MCP] Failed to start:', error);
  process.exit(1);
});
