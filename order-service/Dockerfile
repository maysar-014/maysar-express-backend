# ==========================================
# Order Service - Production Dockerfile
# Multi-stage build for optimized production image
# ==========================================

# ================================
# Stage 1: Dependencies Installation
# ================================
FROM node:18-alpine AS deps
# Add labels for better container management
LABEL maintainer="Maysar DevOps Team" \
      service="order-service" \
      version="1.0.0"

# Set working directory
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite3 \
    postgresql-client

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma/ ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci --only=production=false --no-audit --no-fund

# Generate Prisma client
RUN npx prisma generate

# ================================
# Stage 2: Build Stage
# ================================
FROM deps AS builder

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Run tests in build stage (fail build if tests fail)
RUN npm run test:unit

# Remove dev dependencies for production
RUN npm prune --production

# ================================
# Stage 3: Production Runtime
# ================================
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    postgresql-client \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

# Create app directory with correct permissions
WORKDIR /app
RUN chown nextjs:nodejs /app
USER nextjs

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./

# Copy production dependencies from builder stage
COPY --chown=nextjs:nodejs --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --chown=nextjs:nodejs --from=builder /app/dist ./dist

# Copy Prisma files (schema and migrations)
COPY --chown=nextjs:nodejs --from=builder /app/prisma ./prisma

# Copy environment files
COPY --chown=nextjs:nodejs .env.example ./

# Create necessary directories with correct permissions
RUN mkdir -p logs reports && \
    chown -R nextjs:nodejs logs reports

# ================================
# Configuration & Security
# ================================

# Expose port
EXPOSE 3002

# Set environment variables
ENV NODE_ENV=production \
    PORT=3002 \
    NPM_CONFIG_LOGLEVEL=warn

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3002/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# ================================
# Metadata & Documentation
# ================================

# Additional labels
LABEL org.opencontainers.image.title="Order Service" \
      org.opencontainers.image.description="Enterprise-grade Order Service for Maysar Digital Community Trade Network" \
      org.opencontainers.image.vendor="Maysar" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/maysar/order-service" \
      org.opencontainers.image.licenses="Proprietary"

# ================================
# Security Considerations
# ================================
# - Non-root user (nextjs:nodejs)
# - Minimal attack surface (Alpine Linux)
# - No unnecessary packages in final image
# - Proper signal handling (dumb-init)
# - Health checks for container orchestration
# - Read-only filesystem where possible
