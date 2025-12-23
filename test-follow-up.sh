#!/bin/bash

# Test script for manually testing the follow-up endpoint
# Usage: ./test-follow-up.sh <order-id> <channel> <message>

set -e

API_URL="${API_BASE_URL:-http://localhost:3000}"

if [ $# -lt 3 ]; then
  echo "Usage: $0 <order-id> <channel> <message>"
  echo ""
  echo "Example:"
  echo "  $0 abc-123-def-456 EMAIL 'Hello, this is a test message'"
  echo ""
  echo "Channels: EMAIL, SMS, VOICE"
  exit 1
fi

ORDER_ID=$1
CHANNEL=$2
MESSAGE=$3

echo "🧪 Testing follow-up endpoint..."
echo "   Order ID: $ORDER_ID"
echo "   Channel: $CHANNEL"
echo "   Message: $MESSAGE"
echo "   API URL: $API_URL"
echo ""

# Check if API server is running
if ! curl -s -f "$API_URL/health" > /dev/null; then
  echo "❌ Error: API server is not running at $API_URL"
  echo "   Please start the server with: npm run dev"
  exit 1
fi

echo "✅ API server is running"
echo ""

# Send the follow-up request
echo "📤 Sending follow-up request..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/follow-ups" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"channel\": \"$CHANNEL\",
    \"message\": \"$MESSAGE\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📥 Response (HTTP $HTTP_CODE):"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "✅ Follow-up sent successfully!"
else
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  echo "❌ Follow-up failed with HTTP $HTTP_CODE"
  echo ""
  echo "💡 Common issues:"
  echo "   - Order ID not found"
  echo "   - Provider doesn't have $CHANNEL contact info"
  echo "   - Email channel not configured (RESEND_API_KEY missing)"
  echo "   - Invalid channel (must be EMAIL, SMS, or VOICE)"
fi

