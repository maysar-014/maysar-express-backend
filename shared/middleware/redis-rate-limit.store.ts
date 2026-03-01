import { Store, Options, IncrementResponse } from 'express-rate-limit';
import Redis from 'ioredis';

const LUA_SCRIPT = `
local totalHits = redis.call("INCR", KEYS[1])
local timeToExpire = redis.call("PTTL", KEYS[1])
if timeToExpire == -1 or timeToExpire == -2 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  timeToExpire = ARGV[1]
end
return { totalHits, timeToExpire }
`;

export class RedisRateLimitStore implements Store {
    redisClient: Redis;
    prefix: string;
    windowMs!: number;

    constructor(client: Redis, prefix: string = 'rl:') {
        this.redisClient = client;
        this.prefix = prefix;
    }

    init(options: Options): void {
        this.windowMs = options.windowMs;
    }

    async increment(key: string): Promise<IncrementResponse> {
        const redisKey = this.prefix + key;

        const result = await this.redisClient.eval(
            LUA_SCRIPT,
            1,
            redisKey,
            this.windowMs
        ) as [number, number];

        const totalHits = result[0];
        const pttl = result[1];

        const resetTime = new Date(Date.now() + pttl);

        return {
            totalHits,
            resetTime
        };
    }

    async decrement(key: string): Promise<void> {
        await this.redisClient.decr(this.prefix + key);
    }

    async resetKey(key: string): Promise<void> {
        await this.redisClient.del(this.prefix + key);
    }
}
