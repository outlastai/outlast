# Testing Guide - OutLast Langchain Agent

Step-by-step guide to test the agent with real data.

## Prerequisites

1. **OpenAI API Key**
   ```bash
   export OPENAI_API_KEY=your-openai-api-key-here
   ```

2. **API Server Running**
   - The API server must be running on `http://localhost:3000`
   - Database must be set up and migrated

3. **Dependencies Installed**
   ```bash
   npm install
   ```

## Quick Start (Automated)

The easiest way to test:

```bash
# Terminal 1: Start the API server
npm run dev

# Terminal 2: Run the quick test script
npm run test:agent
```

This script will:
- ✅ Check API server is running
- ✅ Check OpenAI API key is set
- ✅ Create a test provider
- ✅ Create a test order
- ✅ Add initial history
- ✅ Build the AI module
- ✅ Run the agent analysis

## Manual Step-by-Step Testing

### Step 1: Start the API Server

```bash
# Terminal 1: Start the API server
npm run dev
```

You should see:
```
Server started on port 3000
Database connected
```

Keep this terminal running.

### Step 2: Create Test Data

#### 2.1 Create a Provider

```bash
# Terminal 2: Create a test provider
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Provider Inc",
    "preferredChannel": "EMAIL",
    "contactInfo": {
      "EMAIL": "contact@testprovider.com",
      "SMS": "+1234567890"
    }
  }'
```

**Save the provider ID** from the response (you'll need it for the next step).

Example response:
```json
{
  "id": "abc-123-def-456",
  "name": "Test Provider Inc",
  ...
}
```

#### 2.2 Create an Order

```bash
# Replace PROVIDER_ID with the ID from step 2.1
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-TEST-001",
    "partName": "Widget Assembly",
    "providerId": "PROVIDER_ID",
    "status": "PENDING",
    "priority": "NORMAL",
    "expectedDeliveryDate": "2024-12-15T00:00:00Z"
  }'
```

**Save the order ID** from the response.

Example response:
```json
{
  "id": "order-uuid-here",
  "orderId": "ORD-TEST-001",
  ...
}
```

#### 2.3 Create Some Order History (Optional but Recommended)

This gives the agent context to analyze:

```bash
# Replace ORDER_ID with the ID from step 2.2
curl -X POST http://localhost:3000/api/order-history \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "type": "MANUAL_ENTRY",
    "aiSummary": "Order created and pending provider confirmation",
    "context": {
      "daysSinceCreation": 0,
      "initialStatus": "PENDING"
    },
    "metadata": {
      "source": "manual",
      "createdBy": "test"
    }
  }'
```

### Step 3: Test the Agent

#### 3.1 Build the AI Module

```bash
npm run ai:build
```

#### 3.2 Run the Agent Example

```bash
# Replace ORDER_ID with the actual order ID from step 2.2
npm run ai:example ORDER_ID
```

#### 3.3 Expected Output

You should see:
1. Agent initialization messages
2. Tool calls (get_order, get_order_history)
3. Agent analysis
4. Order history entry creation
5. Final analysis result

Example output:
```
🔍 Analyzing order: order-uuid-here

This may take a moment as the agent analyzes the order...

[Agent processing...]

✅ === Order Analysis Complete ===

{
  "orderId": "...",
  "shouldFollowUp": true,
  "recommendedChannel": "EMAIL",
  "confidence": 0.85,
  ...
}

💡 Check the order history to see the detailed analysis entry.
```

### Step 4: Verify Results

#### 4.1 Check Order History

The agent should have created a new history entry:

```bash
# Replace ORDER_ID with your order ID
curl http://localhost:3000/api/order-history?orderId=ORDER_ID | jq
```

Look for an entry with:
- `type: "AI_ANALYSIS"`
- `aiSummary`: Contains the agent's analysis
- `context`: Structured context data
- `metadata`: Decision and reasoning

#### 4.2 Check the Analysis

The history entry should contain:
- Clear summary of the situation
- Decision about follow-up
- Recommended channel
- Confidence level
- Reasoning

## Step 5: Test Different Scenarios

### Scenario 1: Order Needing Follow-Up

Create an order that's been pending for a while:

```bash
# Create order with old date
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-OLD-001",
    "partName": "Delayed Part",
    "providerId": "PROVIDER_ID",
    "status": "PENDING",
    "priority": "HIGH"
  }'

# Add history showing it's been pending
curl -X POST http://localhost:3000/api/order-history \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "type": "STATUS_UPDATE",
    "aiSummary": "Order has been pending for 14 days without update",
    "context": {
      "daysSinceLastUpdate": 14,
      "followUpCount": 0
    }
  }'
```

Then run the agent - it should recommend follow-up.

### Scenario 2: Recently Updated Order

Create an order that was just updated:

```bash
# Add recent history
curl -X POST http://localhost:3000/api/order-history \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "type": "STATUS_UPDATE",
    "aiSummary": "Order status updated to IN_TRANSIT today",
    "context": {
      "daysSinceLastUpdate": 0,
      "lastStatus": "IN_TRANSIT"
    }
  }'
```

The agent should determine no follow-up is needed yet.

## Step 6: Interactive Testing

### 6.1 Create a Test Script

Create `test-agent.ts`:

```typescript
import { createApiClient, createTools, createAgent, createWorkflows } from '@outlast/ai';
import { getLogger } from '@outlast/logger';

async function test() {
  const logger = getLogger({ service: 'test', filePath: __filename });
  
  const apiClient = createApiClient('http://localhost:3000');
  const tools = createTools({ apiClient });
  const agent = await createAgent({
    config: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4',
      temperature: 0.7
    },
    tools,
    logger
  });

  const workflows = createWorkflows({ agent, logger });
  
  // Test with your order ID
  const orderId = process.argv[2];
  if (!orderId) {
    console.error('Usage: ts-node test-agent.ts <order-id>');
    process.exit(1);
  }

  console.log(`\n🔍 Analyzing order: ${orderId}\n`);
  const analysis = await workflows.analyzeOrder(orderId);
  console.log('\n✅ Analysis Complete:\n', JSON.stringify(analysis, null, 2));
}

test().catch(console.error);
```

### 6.2 Run It

```bash
ts-node test-agent.ts <order-id>
```

## Step 7: Debugging

### Check API Server Logs

Watch the API server terminal for:
- Incoming requests from the agent
- Database queries
- Any errors

### Check Agent Output

The agent runs in verbose mode, so you'll see:
- Tool calls
- Tool responses
- Agent reasoning
- Final output

### Common Issues

1. **"Failed to get order"**
   - Check the order ID is correct
   - Verify API server is running
   - Check order exists in database

2. **"OpenAI API error"**
   - Verify API key is set: `echo $OPENAI_API_KEY`
   - Check API key is valid
   - Ensure you have credits

3. **"Tool not found"**
   - Rebuild the AI module: `npm run ai:build`
   - Check tools are properly exported

4. **"Cannot find module '@outlast/logger'"**
   - Build the logger module: `cd mods/logger && npm run build`
   - Or build all: `npm run build`

## Step 8: Verify Agent Decisions

After running the agent, check:

1. **Order History** - Should have new AI_ANALYSIS entry
2. **Analysis Quality** - Summary should be clear and actionable
3. **Context Data** - Should include relevant metrics
4. **Metadata** - Should show decision and reasoning

## Quick Test Checklist

- [ ] API server running on port 3000
- [ ] Database migrated and connected
- [ ] OpenAI API key set (`echo $OPENAI_API_KEY`)
- [ ] Test provider created
- [ ] Test order created
- [ ] AI module built (`npm run ai:build`)
- [ ] Agent runs without errors
- [ ] Order history entry created
- [ ] Analysis contains useful information

## Example Full Test Flow

```bash
# 1. Start server (Terminal 1)
npm run dev

# 2. Create provider and save ID (Terminal 2)
PROVIDER_ID=$(curl -s -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","preferredChannel":"EMAIL","contactInfo":{"EMAIL":"test@test.com"}}' \
  | jq -r '.id')

# 3. Create order and save ID
ORDER_ID=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"ORD-001\",\"partName\":\"Test Part\",\"providerId\":\"$PROVIDER_ID\"}" \
  | jq -r '.id')

# 4. Run agent
npm run ai:example $ORDER_ID

# 5. Check results
curl http://localhost:3000/api/order-history?orderId=$ORDER_ID | jq
```

## Troubleshooting

### Agent takes too long
- This is normal for first run (30-60 seconds)
- Agent is making multiple API calls and LLM requests
- Check API server logs to see tool calls

### No analysis in history
- Check agent output for errors
- Verify order ID is correct
- Check API server is responding

### Agent gives generic responses
- Add more context in order history
- Try different order scenarios
- Adjust temperature in agent config

Happy testing! 🚀
