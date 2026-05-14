export const chatConfig = {
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'maysar',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'maysar2026',
    bucketChatMedia: process.env.S3_BUCKET_CHAT_MEDIA ?? 'chat-media',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE === 'true') ?? true,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD ?? '',
  },
  notification: {
    serviceUrl:
      process.env.NOTIFICATION_SERVICE_URL ??
      'http://localhost:3000/api/notifications',
    serviceKey:
      (process.env.ALLOWED_SERVICE_KEYS ?? '').split(',')[0]?.trim() ?? '',
  },
  meilisearch: {
    host: process.env.MEILISEARCH_HOST ?? 'localhost',
    port: Number(process.env.MEILISEARCH_PORT ?? 7700),
    apiKey: process.env.MEILISEARCH_API_KEY ?? 'dev-master-key',
  },
  rateLimit: {
    maxConversationsPerHour: 20,
    maxMessagesPerHour: 200,
    massMsgWindowSeconds: 300,
    massMsgThreshold: 5,
  },
} as const;
