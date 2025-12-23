# Outlast AI

Logistics follow-up automation system that manages multi-channel communication for order tracking and provider outreach.

## Project Structure

```
outlast/
├── mods/
│   ├── apiserver/          # API server with Prisma
│   ├── common/             # Shared utilities and errors
│   ├── logger/             # Logging utilities
│   └── ...                 # Other modules (to be added)
├── config/                 # Configuration files
├── aidocs/                 # Generated documentation
└── etc/                    # Environment configs
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example file
cp env.example .env

# Edit .env and add your API keys:
# - OPENAI_API_KEY (required for AI agent)
# - RESEND_API_KEY (required for email channel)
# - DATABASE_URL (defaults to ./mods/apiserver/dev.db)
```

3. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

All environment variables are now centralized in the root `.env` file. See [aidocs/ENV_SETUP.md](./aidocs/ENV_SETUP.md) for details.

### Running the API Server

From the project root:
```bash
npm run dev          # Development server
npm start           # Production server (after build)
```

The API will be available at `http://localhost:3000`

### Running Tests

From the project root:
```bash
npm test                    # Run all tests in all workspaces
npm run test:integration    # Run integration tests
npm run test:all            # Run all tests (unit + integration)
```

### Available Scripts

From the project root, you can run:

**Development:**
- `npm run dev` - Start development server
- `npm start` - Start production server (requires build)

**Database:**
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

**Testing:**
- `npm test` - Run all tests in all workspaces
- `npm run test:integration` - Run integration tests
- `npm run test:all` - Run all tests (unit + integration)

**Build & Maintenance:**
- `npm run build` - Build all workspaces
- `npm run lint` - Lint all workspaces
- `npm run clean` - Clean build artifacts

**MCP Server:**
- `npm run mcp:build` - Build MCP server
- `npm run mcp:dev` - Run MCP server in development mode
- `npm run mcp:claude:configure` - Configure Claude Desktop automatically

## API Endpoints

### Providers

- `POST /api/providers` - Create a provider
- `GET /api/providers` - List providers (supports `limit` and `offset` query params)
- `GET /api/providers/:id` - Get a provider by ID
- `PUT /api/providers/:id` - Update a provider
- `DELETE /api/providers/:id` - Delete a provider

### Health Check

- `GET /health` - Health check endpoint

## Example: Creating a Provider

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "preferredChannel": "EMAIL",
    "contactInfo": {
      "EMAIL": "contact@acme.com",
      "SMS": "+1234567890"
    }
  }'
```

## Development

### Building

```bash
npm run build
```

### Database Management

```bash
cd mods/apiserver
npm run prisma:studio  # Open Prisma Studio
npm run prisma:migrate # Run migrations
```

## Email Channel

The email channel is fully implemented using Resend. See [aidocs/EMAIL_CHANNEL_SETUP.md](./aidocs/EMAIL_CHANNEL_SETUP.md) for setup instructions.

**Quick Setup:**
```bash
# Add to mods/apiserver/.env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
```

**Send Follow-Up:**
```bash
POST /api/follow-ups
{
  "orderId": "uuid",
  "channel": "EMAIL",
  "message": "Your order update..."
}
```

## MCP Server

The OutLast API is exposed as an MCP (Model Context Protocol) server, allowing AI assistants like Claude Desktop to interact with your data.

### Quick Setup

1. Build the MCP server:
```bash
npm run mcp:build
```

2. Configure Claude Desktop automatically:
```bash
npm run mcp:claude:configure
```

This script will:
- Detect your platform (macOS, Windows, or Linux)
- Find or create Claude Desktop's config file
- Add the OutLast MCP server configuration
- Set the API base URL (defaults to `http://localhost:3000`)

3. Restart Claude Desktop and start the API server:
```bash
npm run dev
```

### Available Tools

Once configured, Claude can use these tools:
- `get_orders` - List orders with optional status filtering
- `get_providers` - List providers
- `get_order` - Get a specific order by ID or orderId

### Custom API URL

To use a different API URL:
```bash
API_BASE_URL=http://your-api-url:3000 npm run mcp:claude:configure
```

### Manual Configuration

If you prefer to configure manually, see [mods/mcp-server/README.md](./mods/mcp-server/README.md) for details.

## Testing the Agent

See [aidocs/TESTING_GUIDE.md](./aidocs/TESTING_GUIDE.md) for detailed step-by-step testing instructions.

### Quick Test

```bash
# 1. Start the API server (in one terminal)
npm run dev

# 2. Run the quick test script (in another terminal)
npm run test:agent
```

Or manually:

```bash
# 1. Create test data
# 2. Set OPENAI_API_KEY
export OPENAI_API_KEY=your-key-here

# 3. Run the agent
npm run ai:example <order-id>
```

The agent can now send emails automatically when it decides a follow-up is needed!

## License

Private

