import type Redis from 'ioredis';
import type { RedisClientType } from 'redis';

export async function scanKeysIoredis(
  client: Redis,
  pattern: string,
  count: number = 500
): Promise<string[]> {
  let cursor = '0';
  const keys: string[] = [];

  do {
    const [nextCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
    cursor = nextCursor;
    if (batch.length > 0) {
      keys.push(...batch);
    }
  } while (cursor !== '0');

  return keys;
}

type NodeRedisScanResponse = { cursor: number | string; keys: string[] } | [string, string[]];

export async function scanKeysNodeRedis(
  client: RedisClientType,
  pattern: string,
  count: number = 500
): Promise<string[]> {
  let cursor = 0;
  const keys: string[] = [];

  do {
    const response = await (client as unknown as {
      scan: (c: number, options: { MATCH: string; COUNT: number }) => Promise<NodeRedisScanResponse>;
    }).scan(cursor, { MATCH: pattern, COUNT: count });

    if (Array.isArray(response)) {
      cursor = Number.parseInt(response[0], 10);
      if (response[1].length > 0) {
        keys.push(...response[1]);
      }
      continue;
    }

    cursor = Number(response.cursor);
    if (response.keys.length > 0) {
      keys.push(...response.keys);
    }
  } while (cursor !== 0);

  return keys;
}

