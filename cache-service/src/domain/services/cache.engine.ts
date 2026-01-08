export interface CacheInput {
  key: string;
  data?: any;
  ttl?: number;
  tags?: string[];
  strategy: 'get' | 'set' | 'delete' | 'invalidate' | 'flush' | 'stats';
  namespace?: string;
  compression?: boolean;
  metadata?: Record<string, any>;
}

export interface CacheOutput {
  success: boolean;
  hit: boolean;
  data?: any;
  performance: CachePerformance;
  metadata: CacheMetadata;
  warnings: string[];
  recommendations: string[];
}

export interface CachePerformance {
  responseTime: number;
  hitRate: number;
  missRate: number;
  evictionRate: number;
  memoryUsage: number;
  throughput: number;
}

export interface CacheMetadata {
  key: string;
  size: number;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  tags: string[];
  compressed: boolean;
  namespace: string;
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  tags: string[];
  compressed: boolean;
  namespace: string;
}

export interface CacheStats {
  totalRequests: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  memoryUsage: number;
  keyCount: number;
  averageResponseTime: number;
  throughput: number;
  uptime: number;
}

export class CacheEngine {
  private readonly ACCURACY_TARGET = 99.9;
  private readonly MAX_PROCESSING_TIME = 5; // ms
  private readonly DEFAULT_TTL = 3600; // 1 hour
  private readonly MAX_MEMORY = 1024 * 1024 * 1024; // 1GB
  
  private cache: Map<string, CacheEntry> = new Map();
  private stats!: CacheStats;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.initializeStats();
    this.startCleanupInterval();
  }

  async processCacheRequest(input: CacheInput): Promise<CacheOutput> {
    const startTime = Date.now();
    
    try {
      const validationResult = await this.validateInput(input);
      if (!validationResult.valid) {
        throw new Error(`Cache validation failed: ${validationResult.errors.join(', ')}`);
      }

      let result: any;
      let hit = false;

      switch (input.strategy) {
        case 'get':
          result = await this.get(input.key, input.namespace);
          hit = result !== null;
          break;
        case 'set':
          result = await this.set(input.key, input.data, input.ttl, input.tags, input.namespace, input.compression);
          break;
        case 'delete':
          result = await this.delete(input.key, input.namespace);
          break;
        case 'invalidate':
          result = await this.invalidateByTags(input.tags || []);
          break;
        case 'flush':
          result = await this.flush(input.namespace);
          break;
        case 'stats':
          result = await this.getStats();
          break;
        default:
          throw new Error(`Unknown cache strategy: ${input.strategy}`);
      }

      this.updateStats(input.strategy, hit, Date.now() - startTime);
      const performance = this.calculatePerformance();
      const metadata = this.generateMetadata(input, result);
      const { warnings, recommendations } = await this.generateInsights(performance, input);

      return {
        success: true,
        hit,
        data: result,
        performance,
        metadata,
        warnings,
        recommendations
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      this.updateStats(input.strategy, false, processingTime);

      return {
        success: false,
        hit: false,
        data: null,
        performance: this.calculatePerformance(),
        metadata: {
          key: input.key,
          size: 0,
          ttl: 0,
          createdAt: new Date(),
          lastAccessed: new Date(),
          accessCount: 0,
          tags: [],
          compressed: false,
          namespace: input.namespace || 'default'
        },
        warnings: [error.message],
        recommendations: ['Check cache configuration', 'Verify input parameters']
      };
    }
  }

  private async validateInput(input: CacheInput): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!input.key || input.key.length === 0) {
      errors.push('Cache key is required');
    }

    if (input.key && input.key.length > 250) {
      errors.push('Cache key too long (max 250 characters)');
    }

    const validStrategies = ['get', 'set', 'delete', 'invalidate', 'flush', 'stats'];
    if (!validStrategies.includes(input.strategy)) {
      errors.push('Invalid cache strategy');
    }

    if (input.strategy === 'set' && input.data === undefined) {
      errors.push('Data is required for set operation');
    }

    if (input.ttl && (input.ttl < 0 || input.ttl > 86400 * 7)) {
      errors.push('TTL must be between 0 and 7 days');
    }

    return { valid: errors.length === 0, errors };
  }

  private async get(key: string, namespace: string = 'default'): Promise<any> {
    const fullKey = this.buildKey(key, namespace);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      return null;
    }

    entry.lastAccessed = new Date();
    entry.accessCount++;

    if (entry.compressed) {
      return this.decompress(entry.value);
    }

    return entry.value;
  }

  private async set(key: string, data: any, ttl: number = this.DEFAULT_TTL, tags: string[] = [], namespace: string = 'default', compression: boolean = false): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    const dataSize = this.calculateSize(data);
    
    if (this.getCurrentMemoryUsage() + dataSize > this.MAX_MEMORY) {
      await this.evictEntries(dataSize);
    }

    let finalData = data;
    let isCompressed = false;
    
    if (compression || dataSize > 1024) {
      finalData = this.compress(data);
      isCompressed = true;
    }

    const entry: CacheEntry = {
      key: fullKey,
      value: finalData,
      ttl: ttl * 1000,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      size: dataSize,
      tags,
      compressed: isCompressed,
      namespace
    };

    this.cache.set(fullKey, entry);
    return true;
  }

  private async delete(key: string, namespace: string = 'default'): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    return this.cache.delete(fullKey);
  }

  private async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  private async flush(namespace?: string): Promise<number> {
    let flushed = 0;
    
    if (namespace) {
      for (const [key, entry] of this.cache.entries()) {
        if (entry.namespace === namespace) {
          this.cache.delete(key);
          flushed++;
        }
      }
    } else {
      flushed = this.cache.size;
      this.cache.clear();
    }
    
    return flushed;
  }

  private async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  private buildKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === 0) return false;
    return Date.now() - entry.createdAt.getTime() > entry.ttl;
  }

  private calculateSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private async evictEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());
    
    let freedSpace = 0;
    let evicted = 0;
    
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      freedSpace += entry.size;
      evicted++;
    }
    
    this.stats.evictions += evicted;
  }

  private compress(data: any): any {
    const jsonString = JSON.stringify(data);
    return {
      compressed: true,
      data: jsonString,
      originalSize: jsonString.length,
      compressedSize: Math.floor(jsonString.length * 0.7)
    };
  }

  private decompress(compressedData: any): any {
    if (compressedData.compressed) {
      return JSON.parse(compressedData.data);
    }
    return compressedData;
  }

  private updateStats(strategy: string, hit: boolean, responseTime: number): void {
    this.stats.totalRequests++;
    
    if (strategy === 'get') {
      if (hit) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
    }
    
    this.stats.hitRate = this.stats.totalRequests > 0 ? (this.stats.hits / this.stats.totalRequests) * 100 : 0;
    this.stats.keyCount = this.cache.size;
    this.stats.memoryUsage = this.getCurrentMemoryUsage();
    this.stats.averageResponseTime = (this.stats.averageResponseTime + responseTime) / 2;
    this.stats.uptime = Date.now() - this.startTime.getTime();
  }

  private calculatePerformance(): CachePerformance {
    const totalRequests = this.stats.totalRequests || 1;
    
    return {
      responseTime: this.stats.averageResponseTime,
      hitRate: this.stats.hitRate,
      missRate: 100 - this.stats.hitRate,
      evictionRate: (this.stats.evictions / totalRequests) * 100,
      memoryUsage: (this.stats.memoryUsage / this.MAX_MEMORY) * 100,
      throughput: this.stats.totalRequests / (this.stats.uptime / 1000)
    };
  }

  private generateMetadata(input: CacheInput, result: any): CacheMetadata {
    const entry = this.cache.get(this.buildKey(input.key, input.namespace || 'default'));
    
    if (entry) {
      return {
        key: input.key,
        size: entry.size,
        ttl: entry.ttl,
        createdAt: entry.createdAt,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount,
        tags: entry.tags,
        compressed: entry.compressed,
        namespace: entry.namespace
      };
    }
    
    return {
      key: input.key,
      size: 0,
      ttl: 0,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
      tags: input.tags || [],
      compressed: false,
      namespace: input.namespace || 'default'
    };
  }

  private async generateInsights(performance: CachePerformance, input: CacheInput): Promise<{ warnings: string[]; recommendations: string[] }> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (performance.hitRate < 80) {
      warnings.push(`Low cache hit rate: ${performance.hitRate.toFixed(1)}%`);
      recommendations.push('Review caching strategy and TTL settings');
    }

    if (performance.memoryUsage > 90) {
      warnings.push(`High memory usage: ${performance.memoryUsage.toFixed(1)}%`);
      recommendations.push('Consider increasing cache size or reducing TTL');
    }

    if (performance.responseTime > this.MAX_PROCESSING_TIME) {
      warnings.push(`Response time above target: ${performance.responseTime.toFixed(1)}ms`);
      recommendations.push('Optimize cache operations or increase resources');
    }

    return { warnings, recommendations };
  }

  private initializeStats(): void {
    this.stats = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      memoryUsage: 0,
      keyCount: 0,
      averageResponseTime: 0,
      throughput: 0,
      uptime: 0
    };
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // 5 minutes
  }

  private cleanupExpiredEntries(): void {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}