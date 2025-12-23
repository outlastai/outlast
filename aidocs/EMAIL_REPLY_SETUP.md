# Channel Webhook Setup (Email Replies)

## Overview

The OutLast system uses a **unified webhook handler** that supports all channels (EMAIL, SMS, VOICE). When a provider replies via any channel, the system will:

1. **Capture the reply** via webhook
2. **Extract order information** from the email (subject, headers, or body)
3. **Analyze the reply** using AI to extract order status updates
4. **Update order status** automatically if status changes are detected
5. **Create order history** entries for the reply

## Architecture

```
Provider replies via channel (EMAIL/SMS/VOICE)
  ↓
Channel provider (Resend/Twilio/etc.) receives reply
  ↓
Webhook POST to /api/webhooks/channel
  ↓
ChannelWebhookHandler normalizes to ChannelCallback format
  ↓
Channel-specific processor (EmailReplyHandler, etc.)
  ↓
ReplyParser extracts order ID
  ↓
ReplyAnalyzer analyzes content (AI or rule-based)
  ↓
OrderService updates order status
  ↓
OrderHistoryService creates history entry
```

## Unified Webhook Interface

All channels use the same webhook endpoint: **`POST /api/webhooks/channel`**

The handler automatically:
- Detects the channel type (EMAIL, SMS, VOICE)
- Detects the provider (Resend, Twilio, etc.)
- Normalizes to `ChannelCallback` format
- Routes to channel-specific processors

## Resend Email Setup

Since you're using Resend for email:

### 1. Configure Resend Webhooks

1. **Go to Resend Dashboard** → Webhooks
2. **Add Webhook URL**: `https://your-ngrok-url.ngrok.io/api/webhooks/channel`
3. **Select Events**:
   - `email.sent` - Email was sent
   - `email.delivered` - Email was delivered
   - `email.bounced` - Email bounced
   - `email.opened` - Email was opened
   - `email.replied` - **Email reply received** (for replies)

### 2. Resend Reply Handling - IMPORTANT LIMITATION

**⚠️ Resend's `email.replied` event has significant limitations:**

Resend is primarily an **outbound** email service. Their inbound email/reply handling is **limited**:

1. **`email.replied` may not work reliably** - Resend doesn't have robust inbound email infrastructure like Mailgun or SendGrid
2. **Requires verified domain** - You need a verified domain in Resend
3. **MX records may be required** - Resend may need MX records to receive emails (not well documented)
4. **Not all replies are captured** - Replies may not trigger webhooks consistently

**What works with Resend:**
- ✅ `email.sent` - Works reliably
- ✅ `email.delivered` - Works reliably  
- ✅ `email.bounced` - Works reliably
- ✅ `email.opened` - Works reliably
- ❓ `email.replied` - **Unreliable, may not work**

**If `email.replied` doesn't work, you have these options:**

### 3. Recommended Solution: Use Resend for Sending + Mailgun/SendGrid for Receiving

**Best approach for reliable reply handling:**

1. **Keep Resend for sending emails** (it works great for this)
2. **Use Mailgun or SendGrid for receiving replies** (they have robust inbound email support)
3. **Configure forwarding service to POST to `/api/webhooks/channel`**

**Setup steps:**

#### Option A: Mailgun (Recommended)

1. Sign up for Mailgun (free tier available)
2. Add and verify your domain
3. Configure inbound routing:
   - Go to Receiving → Routes
   - Create route: `catch_all()` → `forward("https://your-ngrok-url.ngrok.io/api/webhooks/channel")`
4. Update your email sending to use a Mailgun address as reply-to:
   ```bash
   EMAIL_REPLY_TO=replies@your-verified-domain.com
   ```
5. Mailgun will forward all replies to your webhook

#### Option B: SendGrid

1. Sign up for SendGrid
2. Add and verify your domain  
3. Configure Inbound Parse:
   - Go to Settings → Inbound Parse
   - Add hostname
   - Set POST URL: `https://your-ngrok-url.ngrok.io/api/webhooks/channel`
4. Update MX records as instructed
5. Use SendGrid address as reply-to

#### Option C: IMAP Polling (Future Implementation)

If webhooks aren't available, we can implement IMAP polling:
1. Set up an email account (e.g., `replies@yourdomain.com`)
2. Poll the mailbox periodically for new emails
3. Process replies when found

This requires additional implementation.

## Local Development with ngrok

Since you're on a home network, use ngrok to expose your local server:

### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Start your API server

```bash
npm run dev
# Server runs on http://localhost:3000
```

### 3. Start ngrok tunnel

```bash
ngrok http 3000
```

You'll get output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Configure Resend Webhook

Use the ngrok URL in Resend webhook settings:
- **Resend**: `https://abc123.ngrok.io/api/webhooks/channel`

### 5. Test the Webhook

You can test with curl (simulating Resend's `email.replied` event):

```bash
curl -X POST https://abc123.ngrok.io/api/webhooks/channel \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.replied",
    "created_at": "2024-11-29T12:00:00Z",
    "data": {
      "email_id": "resend-email-id-123",
      "from": "provider@example.com",
      "to": ["replies@yourdomain.com"],
      "subject": "Re: Order Update: ORD-12345",
      "text": "The order has been shipped and will arrive on December 20, 2024."
    }
  }'
```

Or test a delivery event:

```bash
curl -X POST https://abc123.ngrok.io/api/webhooks/channel \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.delivered",
    "created_at": "2024-11-29T12:00:00Z",
    "data": {
      "email_id": "resend-email-id-123",
      "from": "noreply@yourdomain.com",
      "to": ["provider@example.com"],
      "subject": "Order Update: ORD-12345"
    }
  }'
```

## Email Service Configuration

### Update Reply-To Address

Make sure your emails include a reply-to address that routes to your inbound handler:

```bash
# In .env
EMAIL_REPLY_TO=replies@yourdomain.com
```

Or use a service-specific reply-to:
- **Mailgun**: Use your verified domain
- **SendGrid**: Use your verified domain
- **Resend**: Use your verified domain or their test domain

### Email Subject Format

The system automatically includes the order ID in email subjects:
- Format: `Order Update: {orderId}`
- Example: `Order Update: ORD-12345` or `Order Update: 253e1765-36b8-4816-973b-e49fb1b554ac`

This allows the reply parser to extract the order ID from reply subjects like:
- `Re: Order Update: ORD-12345`

## Order ID Extraction

The system tries multiple methods to extract order IDs from replies:

1. **Subject line** (highest confidence)
   - Looks for: `Re: Order Update: ORD-12345`
   - Or UUID format in subject

2. **Email headers**
   - Checks `In-Reply-To` and `References` headers
   - Looks for order IDs in original message references

3. **Email body**
   - Searches for order ID patterns in the reply text
   - Looks for UUIDs or order ID formats

4. **Metadata/tags**
   - Uses email service provider tags if available

## Reply Analysis

The system analyzes replies using:

1. **AI Analysis** (if AI service is configured)
   - Extracts order status updates
   - Identifies delivery dates
   - Summarizes key information
   - Determines if order status should be updated

2. **Rule-Based Analysis** (fallback)
   - Looks for keywords: "shipped", "delivered", "delayed", etc.
   - Extracts dates from text
   - Creates summary from reply content

### Status Detection

The AI/parser looks for:
- **IN_TRANSIT**: "shipped", "in transit", "on the way"
- **DELIVERED**: "delivered", "arrived"
- **DELAYED**: "delayed", "postponed", "backorder"
- **CANCELLED**: "cancelled", "canceled"

## Order Status Updates

When a reply is processed:

1. **Order is found** by extracted order ID
2. **Email is verified** to be from the expected provider
3. **Reply is analyzed** to extract status updates
4. **Order status is updated** if changes are detected
5. **Order history is created** with:
   - Type: `PROVIDER_REPLY`
   - AI summary of the reply
   - Context (extraction method, confidence)
   - Metadata (analysis results, reply content)

## Testing

### Test with Mailgun

1. Send a test email to your Mailgun route
2. Mailgun will forward it to your webhook
3. Check API server logs for processing
4. Verify order status was updated
5. Check order history for the reply entry

### Test with SendGrid

1. Send a test email to your SendGrid inbound address
2. SendGrid will POST to your webhook
3. Check API server logs
4. Verify order was updated

### Manual Test

Use curl to simulate a Resend webhook:

```bash
curl -X POST http://localhost:3000/api/webhooks/channel \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.replied",
    "created_at": "2024-11-29T12:00:00Z",
    "data": {
      "email_id": "test-email-id-123",
      "from": "psanders@fonoster.com",
      "to": ["replies@yourdomain.com"],
      "subject": "Re: Order Update: 253e1765-36b8-4816-973b-e49fb1b554ac",
      "text": "The order has been shipped and will arrive on December 20, 2024."
    }
  }'
```

## Environment Variables

Add to your `.env`:

```bash
# Email Reply-To (for replies to route to inbound handler)
EMAIL_REPLY_TO=replies@yourdomain.com

# Optional: AI service for reply analysis
OPENAI_API_KEY=your-key-here
AI_MODEL=gpt-4
```

## Production Deployment

For production:

1. **Use a public domain** (not ngrok)
2. **Set up SSL/HTTPS** (required for webhooks)
3. **Configure email service** with production webhook URL
4. **Verify webhook signatures** (implement signature verification)
5. **Monitor webhook logs** for errors

## Troubleshooting

### Webhook not receiving events

1. Check ngrok is running: `curl https://your-ngrok-url.ngrok.io/health`
2. Check Resend webhook configuration in dashboard
3. Check API server logs for incoming requests
4. Verify webhook URL is correct: `/api/webhooks/channel`
5. Test with curl to verify endpoint is working

### Order ID not extracted

1. Check email subject includes order ID
2. Check API server logs for extraction attempts
3. Try including order ID in email body as fallback
4. Check extraction confidence in order history metadata

### Order status not updating

1. Check reply analysis results in order history
2. Verify `shouldUpdateStatus` is true in analysis
3. Check order service logs for update attempts
4. Verify order exists and email matches provider

### Email not from expected provider

1. Check provider contact info in database
2. Verify email address matches exactly (case-insensitive)
3. Check API server logs for email mismatch warnings

## Next Steps

- [ ] Implement AI service integration for better reply analysis
- [ ] Add webhook signature verification for security
- [ ] Implement IMAP polling as alternative to webhooks
- [ ] Add support for email attachments
- [ ] Create dashboard view for email replies
- [ ] Add email reply notifications

