# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.14.0
ARG ALPINE_VERSION=3.20

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
WORKDIR /app

# Install and cache dependencies
FROM base AS deps
RUN apk add --no-cache python3 make g++
# Reuse the npm cache across builds and make registry fetches more resilient.
ENV npm_config_audit=false \
    npm_config_fund=false \
    npm_config_progress=false \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_factor=2 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_cache=/root/.npm
RUN --mount=type=cache,id=npm-cache,target=/root/.npm,sharing=locked npm install -g npm@11.11.0
COPY package*.json ./
COPY scripts ./scripts
COPY prisma ./prisma
# Cypress downloads its browser binary during install, which is unnecessary for
# the backend container and can fail in restricted build environments.
RUN --mount=type=cache,id=npm-cache,target=/root/.npm,sharing=locked CYPRESS_INSTALL_BINARY=0 npm ci --prefer-offline --no-audit --no-fund

# Build application
FROM deps AS builder
COPY . .
RUN npm run build
RUN mkdir -p /tmp/railway-prisma \
    && cp -R node_modules/prisma /tmp/railway-prisma/prisma \
    && cp -R node_modules/@prisma/engines /tmp/railway-prisma/engines
RUN npm prune --omit=dev && npm cache clean --force

# Development stage
# Keeps devDependencies so `npm run dev` works with the compose override.
FROM deps AS dev

# Runtime stage
FROM base AS runner
RUN apk add --no-cache dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Copy built application and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/scripts/railway ./scripts/railway
COPY --from=builder --chown=nodejs:nodejs /tmp/railway-prisma/prisma ./node_modules/prisma
COPY --from=builder --chown=nodejs:nodejs /tmp/railway-prisma/engines ./node_modules/@prisma/engines

USER nodejs

# Health check with timeout and explicit error handling
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "const http=require('http');const port=process.env.PORT||3000;const req=http.get({host:'127.0.0.1',port,path:'/health',timeout:4000},res=>process.exit(res.statusCode===200?0:1));req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',()=>process.exit(1));"]

EXPOSE 3000

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
