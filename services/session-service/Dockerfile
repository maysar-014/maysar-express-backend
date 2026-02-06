FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3007/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1) \
    }).on('error', () => process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
