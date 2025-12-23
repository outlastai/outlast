# API Summary

## Completed APIs

### 1. Provider API ✅
**Base Path:** `/api/providers`

- `POST /api/providers` - Create a provider
- `GET /api/providers` - List providers (with pagination, filtering)
- `GET /api/providers/:id` - Get provider by ID
- `PUT /api/providers/:id` - Update provider
- `DELETE /api/providers/:id` - Delete provider

### 2. Order API ✅
**Base Path:** `/api/orders`

- `POST /api/orders` - Create an order
- `GET /api/orders` - List orders (with pagination, filtering by status, providerId)
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/by-order-id/:orderId` - Get order by external orderId
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### 3. Order History API ✅
**Base Path:** `/api/order-history`

- `POST /api/order-history` - Create order history entry (AI-first design)
- `GET /api/order-history` - List order history (requires orderId query param)
- `GET /api/order-history/:id` - Get order history entry by ID

**Features:**
- Auto-increments `conversationTurn` if not provided
- Stores AI summaries, context, metadata, and raw data
- Designed for AI agent consumption

## Async Channel Foundation ✅

### Architecture

**Location:** `mods/apiserver/src/channels/`

**Key Components:**

1. **Types** (`types.ts`)
   - `ChannelMessage` - Base message interface
   - `ChannelSendResponse` - Immediate response (QUEUED/SENT/FAILED)
   - `ChannelCallback` - Async callback from channel providers
   - `ChannelJob` - Job queue structure
   - `ChannelService` - Interface all channels must implement

2. **Channel Job Service** (`channel-job-service.ts`)
   - Manages async job lifecycle
   - Creates/updates FollowUp records
   - Processes callbacks from channel providers
   - Handles retry logic

3. **Stub Implementation** (`stub-channel-service.ts`)
   - Example implementation showing the pattern
   - Ready for real SMS/Email/Voice implementations

### Async Flow

```
1. Agent calls ChannelService.sendMessage()
   → Returns ChannelSendResponse with status=QUEUED
   
2. ChannelJobService.createJob()
   → Creates FollowUp record in database
   
3. Background worker processes job
   → Sends to channel provider (SMS/Email/Voice)
   
4. Channel provider sends callback
   → ChannelJobService.processCallback()
   → Updates FollowUp record with response
```

### Status Tracking

- **QUEUED**: Message queued, waiting to be sent
- **SENT**: Successfully sent to channel provider
- **DELIVERED**: Confirmed delivered to recipient
- **FAILED**: Failed to send
- **READ**: Recipient read the message (if supported)
- **REPLIED**: Recipient replied (if supported)

## Next Steps for Langchain Agent

The agent can now use these APIs as tools:

1. **Order Tools:**
   - `getOrder(orderId)` → GET /api/orders/:id
   - `listOrders(status?, providerId?)` → GET /api/orders
   - `updateOrderStatus(orderId, status)` → PUT /api/orders/:id

2. **Order History Tools:**
   - `getOrderHistory(orderId)` → GET /api/order-history?orderId=...
   - `createOrderHistory(orderId, type, aiSummary, context, metadata)` → POST /api/order-history

3. **Channel Tools (Foundation Ready):**
   - `sendMessage(orderId, channel, content)` → Uses ChannelService (async)
   - `checkMessageStatus(messageId)` → Query FollowUp records

## Example: Creating Order History with AI Context

```typescript
POST /api/order-history
{
  "orderId": "uuid-here",
  "type": "AI_ANALYSIS",
  "aiSummary": "Order ORD-123 has been pending for 14 days. Previous 3 follow-ups via SMS received no response.",
  "context": {
    "daysSinceLastUpdate": 14,
    "followUpCount": 3,
    "lastResponseDate": null,
    "averageResponseTime": 2
  },
  "metadata": {
    "toolsCalled": ["analyzeOrderHistory", "checkProviderPreferences"],
    "decision": "ESCALATE_TO_VOICE",
    "confidence": 0.85
  },
  "conversationTurn": 12
}
```

## Database Models Used

- **Provider** - Provider information
- **Order** - Order tracking
- **OrderHistory** - AI-first conversation history
- **FollowUp** - Async channel communication tracking

All models are ready and migrated!

