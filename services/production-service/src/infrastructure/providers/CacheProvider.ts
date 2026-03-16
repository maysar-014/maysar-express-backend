
export class CacheProvider {
    async get(key: string): Promise<string | null> {
        throw new Error('Cache provider is not configured.');
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        throw new Error('Cache provider is not configured.');
    }
}
