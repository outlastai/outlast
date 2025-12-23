#!/bin/bash

# Test script to verify MCP server works
# This simulates what Claude Desktop does

echo "Testing MCP server..."
echo "===================="

cd "$(dirname "$0")/../mods/mcp-server"

if [ ! -f "dist/index.js" ]; then
  echo "❌ Server not built. Run: npm run mcp:build"
  exit 1
fi

echo "✅ Server file exists"
echo ""
echo "Starting server (will timeout after 2 seconds)..."
echo "If you see '[OutLast MCP] Server started successfully', the server is working!"
echo ""

timeout 2 node dist/index.js 2>&1 || true

echo ""
echo "Test complete. If you saw the success message, the server is working."

