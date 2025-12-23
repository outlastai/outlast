#!/bin/bash

# Test script to verify order lookup works with both UUID and external orderId
# Usage: ./test-order-lookup.sh

set -e

API_URL="${API_BASE_URL:-http://localhost:3000}"

echo "🧪 Testing order lookup..."
echo ""

# Test 1: Get order by external orderId
echo "1️⃣ Testing GET /api/orders/by-order-id/253e1765-36b8-4816-973b-e49fb1b554ac"
EXTERNAL_ORDER_ID="253e1765-36b8-4816-973b-e49fb1b554ac"
RESPONSE=$(curl -s "http://localhost:3000/api/orders/by-order-id/$EXTERNAL_ORDER_ID")
UUID=$(echo "$RESPONSE" | jq -r '.id // empty')

if [ -n "$UUID" ] && [ "$UUID" != "null" ]; then
  echo "✅ Order found! UUID: $UUID"
  echo ""
  
  # Test 2: Try follow-up with external orderId
  echo "2️⃣ Testing POST /api/follow-ups with external orderId"
  FOLLOWUP_RESPONSE=$(curl -s -X POST "$API_URL/api/follow-ups" \
    -H "Content-Type: application/json" \
    -d "{
      \"orderId\": \"$EXTERNAL_ORDER_ID\",
      \"channel\": \"EMAIL\",
      \"message\": \"Test message\"
    }")
  
  ERROR=$(echo "$FOLLOWUP_RESPONSE" | jq -r '.error.message // empty')
  if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
    echo "❌ Follow-up failed: $ERROR"
    echo ""
    echo "💡 The server may need to be restarted to pick up the fix."
    echo "   The fix allows lookup by both UUID and external orderId."
  else
    echo "✅ Follow-up request succeeded!"
    echo "$FOLLOWUP_RESPONSE" | jq '.'
  fi
  
  echo ""
  echo "3️⃣ Alternative: Use the UUID instead"
  echo "   curl -X POST $API_URL/api/follow-ups \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"orderId\": \"$UUID\", \"channel\": \"EMAIL\", \"message\": \"Test\"}'"
else
  echo "❌ Order not found by external orderId"
  echo "$RESPONSE" | jq '.'
fi

