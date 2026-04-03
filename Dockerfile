# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.14.0
ARG ALPINE_VERSION=3.20

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
WORKDIR /app

# Install and cache dependencies
FROM base AS deps
RUN apk add --no-cache python3 make g++
RUN npm install -g npm@11.11.0
COPY package*.json ./
COPY scripts ./scripts
COPY prisma ./prisma
RUN npm ci

# Build application
FROM deps AS builder
COPY . .
RUN npm run build
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

USER nodejs

# Health check with timeout and explicit error handling
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["node", "-e", "const http=require('http');const port=process.env.PORT||3000;const req=http.get({host:'127.0.0.1',port,path:'/health',timeout:4000},res=>process.exit(res.statusCode===200?0:1));req.on('timeout',()=>req.destroy(new Error('timeout')));req.on('error',()=>process.exit(1));"]

EXPOSE 3000

STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
