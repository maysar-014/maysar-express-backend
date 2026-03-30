export class CacheProvider {
    private readonly store = new Map<string, { value: string; expiresAt?: number }>();

    async get<T = unknown>(key: string): Promise<T | null> {
        const entry = this.store.get(key);
        if (!entry) {
            return null;
        }

        if (typeof entry.expiresAt === 'number' && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return null;
        }

        try {
            return JSON.parse(entry.value) as T;
        } catch {
            return entry.value as unknown as T;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        const expiresAt = typeof ttlSeconds === 'number' && ttlSeconds > 0
            ? Date.now() + ttlSeconds * 1000
            : undefined;

        this.store.set(key, {
            value: JSON.stringify(value),
            expiresAt
        });
    }

    async invalidate(pattern: string): Promise<void> {
        const matches = this.createMatcher(pattern);

        for (const key of [...this.store.keys()]) {
            if (matches(key)) {
                this.store.delete(key);
            }
        }
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    async has(key: string): Promise<boolean> {
        return (await this.get(key)) !== null;
    }

    private createMatcher(pattern: string): (key: string) => boolean {
        if (!pattern.includes('*')) {
            return (key: string) => key === pattern;
        }

        const escaped = pattern
            .split('*')
            .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*');
        const regex = new RegExp(`^${escaped}$`);
        return (key: string) => regex.test(key);
    }
}
