# OutLast API Server

API server module for the OutLast logistics follow-up automation system.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

## Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Testing

Run unit tests:
```bash
npm run test
```

Run integration tests:
```bash
npm run test:integration
```

Run all tests:
```bash
npm run test:all
```

## Database

Open Prisma Studio:
```bash
npm run prisma:studio
```

## API Endpoints

### Providers

- `POST /api/providers` - Create a provider
- `GET /api/providers` - List providers
- `GET /api/providers/:id` - Get provider by ID
- `PUT /api/providers/:id` - Update provider
- `DELETE /api/providers/:id` - Delete provider

### Health

- `GET /health` - Health check

## Project Structure

```
src/
├── providers/          # Provider API module
│   ├── types.ts       # TypeScript types
│   ├── provider-service.ts  # Business logic
│   ├── handlers.ts    # Express handlers
│   ├── routes.ts      # Express routes
│   ├── validation.ts # Zod schemas
│   ├── provider-service.test.ts  # Unit tests
│   └── provider.integration.ts  # Integration tests
├── middleware/        # Express middleware
├── app.ts            # Express app setup
└── index.ts          # Server entry point
```

