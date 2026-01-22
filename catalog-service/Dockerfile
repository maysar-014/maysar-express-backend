# =====================================================================================
# CATALOG SERVICE DOCKERFILE
# Multi-stage build for production-ready container with security hardening
# =====================================================================================

# =====================================================================================
# BUILD STAGE - Compile TypeScript and install dependencies
# =====================================================================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma/ ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# =====================================================================================
# PRODUCTION STAGE - Runtime container with minimal attack surface
# =====================================================================================
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S catalog -u 1001

# Create app directory with proper permissions
WORKDIR /app

# Copy package files
COPY --from=builder --chown=catalog:nodejs /app/package*.json ./

# Copy production dependencies
COPY --from=builder --chown=catalog:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=catalog:nodejs /app/dist ./dist

# Copy Prisma files
COPY --from=builder --chown=catalog:nodejs /app/prisma ./prisma

# Copy other necessary files
COPY --from=builder --chown=catalog:nodejs /app/.env.example ./

# Create necessary directories with proper permissions
RUN mkdir -p \
    /app/uploads \
    /app/logs \
    /app/temp \
    && chown -R catalog:nodejs /app/uploads \
    && chown -R catalog:nodejs /app/logs \
    && chown -R catalog:nodejs /app/temp

# Switch to non-root user
USER catalog

# Expose ports
EXPOSE 3000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]

# =====================================================================================
# DEVELOPMENT STAGE - For development with hot reload
# =====================================================================================
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S catalog -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p \
    /app/uploads \
    /app/logs \
    /app/temp \
    && chown -R catalog:nodejs /app/uploads \
    && chown -R catalog:nodejs /app/logs \
    && chown -R catalog:nodejs /app/temp

# Switch to non-root user
USER catalog

# Expose ports
EXPOSE 3000 9090

# Default command for development
CMD ["npm", "run", "dev"]

# =====================================================================================
# TESTING STAGE - For running tests in CI/CD
# =====================================================================================
FROM builder AS testing

# Install additional testing dependencies if needed
RUN apk add --no-cache \
    postgresql-client \
    redis \
    && npm install -g wait-on

# Copy test files and configurations
COPY . .

# Set environment for testing
ENV NODE_ENV=test
ENV DATABASE_URL=postgresql://postgres:password@postgres:5432/catalog_test
ENV REDIS_URL=redis://redis:6379

# Run tests
CMD ["npm", "test"]

# =====================================================================================
# DEFAULT TARGET - Production
# =====================================================================================
FROM production
