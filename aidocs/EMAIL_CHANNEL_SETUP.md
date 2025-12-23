# Email Channel Setup Guide

## Overview

The email channel is now fully implemented using Resend. This allows the agent to send follow-up emails to providers.

## Prerequisites

1. **Resend Account**
   - Sign up at https://resend.com
   - Get your API key from the dashboard
   - Verify your domain (or use Resend's test domain for development)

2. **Environment Variables**

Add to `mods/apiserver/.env`:

```bash
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=OutLast
EMAIL_REPLY_TO=support@yourdomain.com  # Optional
```

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Build the channels module:**
```bash
cd mods/channels && npm run build
```

3. **Build the API server:**
```bash
cd mods/apiserver && npm run build
```

## Configuration

### Resend Setup

1. **Get API Key:**
   - Go to https://resend.com/api-keys
   - Create a new API key
   - Copy it to `RESEND_API_KEY`

2. **Domain Setup (Production):**
   - Add your domain in Resend dashboard
   - Verify DNS records
   - Use verified domain in `EMAIL_FROM`

3. **Development (Testing):**
   - Resend provides a test domain: `onboarding@resend.dev`
   - You can use this for testing without domain verification

### Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Optional (with defaults)
EMAIL_FROM=noreply@outlast.com          # Default: noreply@outlast.com
EMAIL_FROM_NAME=OutLast                 # Default: OutLast
EMAIL_REPLY_TO=support@outlast.com      # Optional
```

## Usage

### Via API

```bash
POST /api/follow-ups
{
  "orderId": "order-uuid",
  "channel": "EMAIL",
  "message": "Your order ORD-123 is delayed. Expected delivery: Dec 20, 2024.",
  "metadata": {
    "priority": "HIGH"
  }
}
```

### Via Agent Tool

The agent now has a `send_follow_up` tool:

```typescript
// Agent can now send emails
await agent.invoke({
  input: "Send a follow-up email to the provider for order ORD-123"
});
```

## Webhook Setup

Resend sends webhooks for delivery status. Configure in Resend dashboard:

1. Go to **Webhooks** in Resend dashboard
2. Add webhook URL: `https://your-domain.com/api/webhooks/email`
3. Select events:
   - `email.sent`
   - `email.delivered`
   - `email.bounced`
   - `email.opened`

### Local Development

For local testing, use a tool like:
- **ngrok**: `ngrok http 3000`
- **localtunnel**: `lt --port 3000`

Then use the ngrok/localtunnel URL in Resend webhook config.

## Testing

### 1. Test Email Sending

```bash
# Create provider with email
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Provider",
    "preferredChannel": "EMAIL",
    "contactInfo": {
      "EMAIL": "your-email@example.com"
    }
  }'

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-TEST-001",
    "partName": "Test Part",
    "providerId": "PROVIDER_ID"
  }'

# Send follow-up
curl -X POST http://localhost:3000/api/follow-ups \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "channel": "EMAIL",
    "message": "Test email message"
  }'
```

### 2. Test with Agent

```bash
# Agent will automatically use email channel
npm run ai:example ORDER_ID
```

The agent will:
1. Analyze the order
2. Decide if follow-up is needed
3. Send email via `send_follow_up` tool
4. Record in order history

### 3. Verify Webhook

Check that webhooks are received:
- Watch API server logs
- Check FollowUp records are updated
- Verify delivery status

## Architecture

```
Agent decides to send follow-up
  ↓
Calls send_follow_up tool
  ↓
POST /api/follow-ups
  ↓
FollowUpService
  ↓
EmailChannelService.sendMessage()
  ↓
Resend API (async)
  ↓
Webhook callback → /api/webhooks/email
  ↓
ChannelJobService.processCallback()
  ↓
Update FollowUp record
```

## Email Template

Emails are sent with:
- **HTML format** with styled template
- **Plain text** fallback
- **Order ID** in subject and body
- **Professional styling**

## Troubleshooting

### "Email channel service not available"
- Check `RESEND_API_KEY` is set
- Verify API key is valid
- Check logs for errors

### "Email address not provided"
- Ensure provider has EMAIL in contactInfo
- Check metadata includes email address

### Webhooks not working
- Verify webhook URL is accessible
- Check Resend webhook configuration
- Test with ngrok/localtunnel for local dev

### Emails not delivered
- Check Resend dashboard for errors
- Verify domain is verified (production)
- Check spam folder
- Review Resend logs

## Next Steps

1. **SMS Channel** - Similar pattern
2. **Voice Channel** - More complex, requires telephony
3. **Scheduler** - Automated follow-up processing
4. **Retry Logic** - Handle failed sends

## Production Checklist

- [ ] Resend API key configured
- [ ] Domain verified in Resend
- [ ] Webhook URL configured
- [ ] Webhook secret set (optional but recommended)
- [ ] Email templates customized
- [ ] Monitoring set up
- [ ] Error handling tested

