# Resend Email Reply Limitations

## The Problem

When you manually reply to an email sent via Resend, you may not receive a webhook event. This is because **Resend has limited inbound email support**.

## Why Replies Don't Work with Resend

Resend is primarily designed as an **outbound email service**. While they have an `email.replied` webhook event, it has significant limitations:

1. **Not all replies are captured** - Resend may not detect replies consistently
2. **Requires verified domain** - You need a fully verified domain with proper DNS setup
3. **MX records may be needed** - Resend may require MX records to receive emails (documentation is unclear)
4. **Limited infrastructure** - Resend doesn't have the same robust inbound email infrastructure as Mailgun or SendGrid

## What Works vs. What Doesn't

### ✅ Works Reliably:
- `email.sent` - Email was sent
- `email.delivered` - Email was delivered to recipient
- `email.bounced` - Email bounced
- `email.opened` - Email was opened (if tracking enabled)

### ❓ Unreliable:
- `email.replied` - **May not work consistently**

## Solutions

### Solution 1: Use Mailgun for Inbound (Recommended)

**Best for production use:**

1. **Keep Resend for sending** (it's great for outbound)
2. **Add Mailgun for receiving** (free tier available, excellent inbound support)
3. **Set reply-to to Mailgun address**

**Setup:**
```bash
# Use Mailgun address for replies
EMAIL_REPLY_TO=replies@your-verified-domain.com
```

Then configure Mailgun to forward to your webhook:
- Mailgun Dashboard → Receiving → Routes
- Route: `catch_all()` → `forward("https://your-webhook-url/api/webhooks/channel")`

### Solution 2: Use SendGrid for Inbound

Similar to Mailgun:
1. Use Resend for sending
2. Use SendGrid for receiving
3. Configure SendGrid Inbound Parse to forward to your webhook

### Solution 3: Test Resend's email.replied (May Not Work)

If you want to try Resend's `email.replied`:

1. **Verify your domain** in Resend dashboard
2. **Set reply-to to your verified domain:**
   ```bash
   EMAIL_REPLY_TO=replies@your-verified-domain.com
   ```
3. **Check Resend dashboard** for `email.replied` events
4. **Configure webhook** for `email.replied` event

**Note:** Even with proper setup, this may not work reliably.

### Solution 4: IMAP Polling (Future)

We can implement IMAP polling as an alternative:
- Poll an email mailbox for new messages
- Process replies when found
- This requires additional implementation

## Current Status

**Your current setup:**
- ✅ Resend configured for sending
- ✅ Webhook endpoint ready at `/api/webhooks/channel`
- ✅ Reply processing logic implemented
- ❌ Resend's `email.replied` may not work

**Recommendation:** Use Mailgun or SendGrid for inbound email handling to ensure reliable reply capture.

## Testing

To test if Resend's `email.replied` is working:

1. Send a test email via your system
2. Reply to that email manually
3. Check Resend dashboard → Webhooks → Events
4. Look for `email.replied` event
5. Check your server logs for webhook receipt

If no webhook is received, Resend's inbound email handling isn't working for your setup.

