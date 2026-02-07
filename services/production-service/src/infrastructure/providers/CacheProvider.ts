
export class CacheProvider {
    async get(key: string): Promise<string | null> {
        // Mock Redis get
        return null;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        // Mock Redis set
    }
}
