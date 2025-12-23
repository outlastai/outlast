# Multi-stage Dockerfile for OutLast
# Based on best practices from fonoster and Node.js production patterns

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY mods/apiserver/package.json ./mods/apiserver/
COPY mods/ai/package.json ./mods/ai/
COPY mods/channels/package.json ./mods/channels/
COPY mods/common/package.json ./mods/common/
COPY mods/logger/package.json ./mods/logger/
COPY mods/mcp-server/package.json ./mods/mcp-server/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma (required for SQLite)
RUN apk add --no-cache openssl libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY mods/apiserver/package.json ./mods/apiserver/
COPY mods/ai/package.json ./mods/ai/
COPY mods/channels/package.json ./mods/channels/
COPY mods/common/package.json ./mods/common/
COPY mods/logger/package.json ./mods/logger/
COPY mods/mcp-server/package.json ./mods/mcp-server/

# Install all dependencies (including devDependencies for building)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app/mods/apiserver
RUN npx prisma generate

# Build all workspaces
WORKDIR /app
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Install OpenSSL for Prisma (required for SQLite)
RUN apk add --no-cache openssl libc6-compat

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 outlast

# Copy package files
COPY package.json package-lock.json ./
COPY mods/apiserver/package.json ./mods/apiserver/
COPY mods/ai/package.json ./mods/ai/
COPY mods/channels/package.json ./mods/channels/
COPY mods/common/package.json ./mods/common/
COPY mods/logger/package.json ./mods/logger/
COPY mods/mcp-server/package.json ./mods/mcp-server/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder --chown=outlast:nodejs /app/mods/apiserver/dist ./mods/apiserver/dist
COPY --from=builder --chown=outlast:nodejs /app/mods/ai/dist ./mods/ai/dist
COPY --from=builder --chown=outlast:nodejs /app/mods/channels/dist ./mods/channels/dist
COPY --from=builder --chown=outlast:nodejs /app/mods/common/dist ./mods/common/dist
COPY --from=builder --chown=outlast:nodejs /app/mods/logger/dist ./mods/logger/dist
COPY --from=builder --chown=outlast:nodejs /app/mods/mcp-server/dist ./mods/mcp-server/dist
COPY --from=builder --chown=outlast:nodejs /app/mods/apiserver/prisma ./mods/apiserver/prisma

# Generate Prisma client in production stage (needed for runtime)
WORKDIR /app/mods/apiserver
RUN npx prisma generate
WORKDIR /app

# Copy necessary config files
COPY --chown=outlast:nodejs config ./config
# Copy env.example if it exists (optional)
COPY --chown=outlast:nodejs env.example* ./

# Copy entrypoint script
COPY --chown=outlast:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create data directory for SQLite database and ensure it's writable
RUN mkdir -p /app/data && \
    chown -R outlast:nodejs /app/data && \
    chmod -R 755 /app/data

# Switch to non-root user
USER outlast

# Set entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default command
CMD ["node", "-r", "dotenv/config", "mods/apiserver/dist/index.js"]

