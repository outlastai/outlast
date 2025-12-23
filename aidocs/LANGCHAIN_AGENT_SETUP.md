# Langchain Agent Setup - Complete ✅

## Overview

The OutLast AI agent is now fully set up with Langchain, ready to analyze orders and make follow-up decisions.

## Module Structure

```
mods/ai/
├── src/
│   ├── types.ts              # Type definitions
│   ├── api-client.ts         # HTTP client for API calls
│   ├── tools.ts              # Langchain tools (API wrappers)
│   ├── agent.ts              # Langchain agent setup
│   ├── workflows.ts          # High-level workflows
│   ├── example.ts            # Example usage
│   └── index.ts              # Exports
├── package.json
└── README.md
```

## Available Tools

The agent has 6 tools that wrap the OutLast APIs:

1. **get_order** - Get order by UUID
   - Input: `{ orderId: string }`
   - Returns: Full order details with provider info

2. **get_order_by_external_id** - Get order by business ID
   - Input: `{ externalOrderId: string }`
   - Returns: Full order details
   - Use for orders like "ORD-12345"

3. **list_orders** - List orders with filters
   - Input: `{ status?, providerId?, limit?, offset? }`
   - Returns: Paginated list of orders

4. **get_order_history** - Get conversation history
   - Input: `{ orderId: string, limit? }`
   - Returns: Order history with AI summaries and context
   - **Critical for agent analysis**

5. **create_order_history** - Record AI analysis
   - Input: `{ orderId, type, aiSummary, context, metadata, ... }`
   - Returns: Created history entry
   - **Used to store agent decisions**

6. **update_order_status** - Update order status
   - Input: `{ orderId: string, status: OrderStatus }`
   - Returns: Updated order

## Agent Capabilities

The agent can:
- ✅ Analyze orders and their history
- ✅ Determine if follow-up is needed
- ✅ Recommend communication channels
- ✅ Generate follow-up messages
- ✅ Record analysis in order history
- ✅ Update order status

## Usage Example

```typescript
import { createApiClient, createTools, createAgent, createWorkflows } from '@outlast/ai';
import { getLogger } from '@outlast/logger';

// Setup
const apiClient = createApiClient('http://localhost:3000');
const tools = createTools({ apiClient });
const agent = await createAgent({
  config: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    temperature: 0.7
  },
  tools,
  logger: getLogger({ service: 'ai', filePath: __filename })
});

const workflows = createWorkflows({ agent, logger });

// Analyze an order
const analysis = await workflows.analyzeOrder('order-uuid-here');
```

## Workflows

### analyzeOrder(orderId)
Main workflow that:
1. Gets order details
2. Gets order history
3. Analyzes the situation
4. Makes follow-up decision
5. Records analysis in history

Returns: `OrderAnalysis` with recommendations

### getOrderContext(orderId)
Gets complete context (order + history + follow-ups) for analysis.

### decideFollowUp(orderId)
Makes a follow-up decision:
- Should we follow up?
- Which channel?
- What message?
- What priority?

## Environment Variables

```bash
OPENAI_API_KEY=your-api-key-here
AI_MODEL=gpt-4                    # Optional, defaults to gpt-4
AI_TEMPERATURE=0.7                 # Optional, defaults to 0.7
API_BASE_URL=http://localhost:3000 # Optional, defaults to localhost:3000
```

## Running the Example

```bash
# Set your API key
export OPENAI_API_KEY=your-key-here

# Run the example
npm run ai:example <order-id>
```

## Next Steps

1. **Test the agent** with real orders
2. **Add structured output** for better parsing
3. **Implement channel tools** for sending messages
4. **Create scheduled workflows** for batch processing
5. **Add error handling** and retry logic

## Integration with API Server

The agent communicates with the API server via HTTP:
- All API endpoints are available as tools
- Agent can read and write order data
- Agent records its analysis in order history
- Agent can update order status

## Architecture Flow

```
User/System
  ↓
Agent Workflow
  ↓
Langchain Agent
  ↓
Tools (API Wrappers)
  ↓
API Client (HTTP)
  ↓
OutLast API Server
  ↓
Database
```

## System Prompt

The agent has a comprehensive system prompt that:
- Defines its role as a logistics follow-up automation agent
- Explains available tools
- Provides guidelines for analysis
- Instructs on recording decisions

See `src/agent.ts` for the full prompt.

## Status

✅ **Complete and Ready**
- All tools implemented
- Agent configured
- Workflows created
- Example usage provided
- Documentation complete

Ready to start analyzing orders! 🚀

