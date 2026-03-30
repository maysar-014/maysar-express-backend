
export class CacheProvider {
    async get(key: string): Promise<string | null> {
        return null;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        return;
    }
}
