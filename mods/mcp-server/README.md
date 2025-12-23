# OutLast MCP Server

MCP (Model Context Protocol) server that exposes OutLast API endpoints as tools for AI assistants.

## Overview

This MCP server wraps the OutLast REST API and makes it available as tools that can be used by AI assistants (like Claude Desktop, Cursor, etc.) to interact with the OutLast system.

## Available Tools

- **`get_orders`**: Get a list of orders with optional status filtering (PENDING, IN_TRANSIT, DELIVERED, DELAYED, CANCELLED)
- **`get_providers`**: Get a list of providers
- **`get_order`**: Get a specific order by ID (UUID) or orderId (external ID like ORD-123)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

## Usage

### Running the Server

The MCP server communicates via stdio, so it's typically run by an MCP client:

```bash
node dist/index.js
```

Or using ts-node for development:
```bash
npm run dev
```

### MCP Client Configuration

#### Automatic Configuration (Recommended)

Use the provided script to automatically configure Claude Desktop:

```bash
# 1. Build the MCP server first
npm run mcp:build

# 2. Configure Claude Desktop
npm run mcp:configure:claude
```

This will automatically:
- Detect your platform (macOS, Windows, or Linux)
- Find or create Claude Desktop's config file
- Add the OutLast MCP server configuration

#### Manual Configuration

Alternatively, you can manually add it to your MCP configuration:

```json
{
  "mcpServers": {
    "outlast": {
      "command": "node",
      "args": ["/path/to/outlast/mods/mcp-server/dist/index.js"]
    }
  }
}
```

**Config file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Testing

1. Configure Claude Desktop (see above)
2. Start the API server: `npm run dev` (from project root)
3. Restart Claude Desktop
4. Test with Claude:
   - "Get all orders from outlast"
   - "Get providers from outlast"
   - "Get order ORD-123 from outlast"

## Development

```bash
# Build
npm run build

# Run in development mode
npm run dev

# Clean build artifacts
npm run clean
```

## Architecture

- **`src/index.ts`**: Main entry point, sets up the MCP server and registers tools
- **`src/api-client.ts`**: HTTP client for communicating with OutLast API

## Adding New Tools

To add a new tool:

1. Add the tool definition to the `ListToolsRequestSchema` handler in `index.ts`
2. Add the tool implementation in the `CallToolRequestSchema` handler
3. Add corresponding methods to `api-client.ts` if needed
4. Test with Claude Desktop
