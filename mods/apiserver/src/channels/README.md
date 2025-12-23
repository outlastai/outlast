# Async Channel Communication Foundation

This module provides the foundation for asynchronous multi-channel communication (SMS, Email, Voice AI).

## Architecture

### Key Concepts

1. **Async by Design**: All channel communications are asynchronous. When you send a message, you get an immediate response with a job ID, but the actual delivery happens asynchronously.

2. **Job Queue Pattern**: Messages are queued as jobs that can be:
   - PENDING: Waiting to be processed
   - PROCESSING: Currently being sent
   - SENT: Successfully sent to channel provider
   - DELIVERED: Confirmed delivered to recipient
   - FAILED: Failed to send

3. **Callback/Webhook Pattern**: Channel providers send callbacks when:
   - Message is delivered
   - Message fails
   - Recipient reads the message
   - Recipient replies

### Flow

```
1. Agent/Service calls ChannelService.sendMessage()
   ↓
2. Returns ChannelSendResponse with messageId and status=QUEUED
   ↓
3. ChannelJobService creates FollowUp record in database
   ↓
4. Background worker processes the job and sends to channel provider
   ↓
5. Channel provider sends callback/webhook when status changes
   ↓
6. ChannelJobService.processCallback() updates FollowUp record
```

## Implementation Status

### ✅ Foundation (Complete)
- `ChannelService` interface
- `ChannelJob` types
- `ChannelCallback` types
- `ChannelJobService` for managing async jobs
- Integration with `FollowUp` model

### 🚧 To Be Implemented
- SMS channel implementation
- Email channel implementation
- Voice AI channel implementation
- Background job processor
- Webhook/callback endpoint handler

## Usage Example

```typescript
// 1. Create channel service (to be implemented)
const smsChannel = createSmsChannel(config);

// 2. Send message (returns immediately)
const response = await smsChannel.sendMessage({
  orderId: 'order-123',
  providerId: 'provider-456',
  channel: 'SMS',
  content: 'Your order is delayed...',
  metadata: { priority: 'HIGH' }
});

// response.status = 'QUEUED'
// response.messageId = 'msg-789'

// 3. Later, channel provider sends callback
await channelJobService.processCallback({
  messageId: 'msg-789',
  channel: 'SMS',
  status: 'DELIVERED',
  timestamp: new Date()
});

// 4. FollowUp record is automatically updated
```

## Next Steps

1. Implement `SmsChannelService` implementing `ChannelService`
2. Implement `EmailChannelService` implementing `ChannelService`
3. Implement `VoiceChannelService` implementing `ChannelService`
4. Create background job processor to handle queued messages
5. Create webhook endpoint to receive callbacks from channel providers

