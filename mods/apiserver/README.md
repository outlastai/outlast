# Outlast API Server

This module is part of Outlast. It provides the REST API, tRPC endpoints, and admin functionality.

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database (Postgres connection string)
OUTLAST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/outlast

# API Server
OUTLAST_PORT=3000

# Basic auth credentials (format: username:password)
OUTLAST_CREDENTIALS=admin:secret
```

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed the database
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

### Running Locally

```bash
# Development mode with hot reload
npm start

# Or from root:
npm run start:apiserver
```

## Docker

### Using Docker Compose

From the project root:

```bash
# Start all services (Postgres + API Server)
docker compose up -d

# View logs
docker compose logs -f apiserver

# Stop all services
docker compose down
```

### Building the Docker Image

```bash
docker build -f mods/apiserver/Dockerfile -t outlast-apiserver .
```

## API Endpoints

### Health Check

```
GET /health
```

Returns `{ "status": "ok" }` when the server is running.

### tRPC API

All tRPC endpoints are available at `/trpc`.

#### Public Endpoints

- `ping` - Returns pong with timestamp

#### Protected Endpoints (require Basic Auth)

- `createRecord` - Create a new record

## Authentication

Protected endpoints require Basic Authentication. Set the `Authorization` header:

```
Authorization: Basic <base64(username:password)>
```

For more information about the project, please visit https://github.com/your-org/outlast.
