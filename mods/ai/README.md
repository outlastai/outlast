# OutLast AI Agent Module

Langchain-based AI agent for automated order follow-up analysis and decision making.

## Overview

This module provides:
- **Langchain Agent**: AI agent with tools to interact with the OutLast API
- **API Tools**: Wrappers around Order and OrderHistory APIs
- **Workflows**: High-level workflows for order analysis and follow-up decisions

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
OPENAI_API_KEY=your-api-key
API_BASE_URL=http://localhost:3000  # Optional, defaults to localhost:3000
```

3. Build:
```bash
npm run build
```

## Usage

```typescript
import { createApiClient, createTools, createAgent, createWorkflows } from '@outlast/ai';
import { getLogger } from '@outlast/logger';

// 1. Create API client
const apiClient = createApiClient(process.env.API_BASE_URL);

// 2. Create tools
const tools = createTools({ apiClient });

// 3. Create agent
const agent = await createAgent({
  config: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
    temperature: 0.7
  },
  tools,
  logger: getLogger({ service: 'ai', filePath: __filename })
});

// 4. Create workflows
const workflows = createWorkflows({ agent, logger });

// 5. Use workflows
const analysis = await workflows.analyzeOrder('order-uuid-here');
```

## Available Tools

The agent has access to these tools:

1. **get_order** - Get order by UUID
2. **get_order_by_external_id** - Get order by business ID (e.g., ORD-123)
3. **list_orders** - List orders with filters
4. **get_order_history** - Get conversation history
5. **create_order_history** - Record AI analysis
6. **update_order_status** - Update order status

## Workflows

### analyzeOrder(orderId)
Analyzes an order and determines if follow-up is needed. Returns structured analysis.

### getOrderContext(orderId)
Gets complete context (order + history + follow-ups) for an order.

### decideFollowUp(orderId)
Makes a follow-up decision (should follow up, which channel, what message).

## Architecture

```
Agent (Langchain)
  ↓
Tools (API Wrappers)
  ↓
API Client (HTTP)
  ↓
OutLast API Server
```

## Next Steps

- Add structured output parsing
- Implement channel message sending tools
- Add retry logic and error handling
- Create scheduled workflows for batch processing

