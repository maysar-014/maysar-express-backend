/**
 * Health Check Service
 * Infrastructure layer for checking service dependencies
 */

import { PrismaClient } from '@prisma/client';
import { PesapalAdapter } from '../providers/pesapal.adapter';
import type { Redis } from 'ioredis';

export interface HealthStatus {

    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    latencyMs?: number;
    details?: Record<string, any>;
}

export interface AggregateHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    service: string;
    timestamp: Date;
    uptime: string;
    dependencies: {
        database: HealthStatus;
        paymentGateway: HealthStatus;
        messaging: HealthStatus;
        cache: HealthStatus;
    };
}

export class HealthCheckService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly pesapalAdapter?: PesapalAdapter,
        private readonly redisClient?: Redis
    ) { }


    /**
     * Check database connectivity with latency measurement
     */
    async checkDatabase(): Promise<HealthStatus> {
        const startTime = Date.now();
        try {
            // Simple query to test database connection
            await this.prisma.$queryRaw`SELECT 1`;
            const latencyMs = Date.now() - startTime;

            return {
                status: 'healthy',
                timestamp: new Date(),
                latencyMs,
                details: {
                    connection: 'successful',
                    type: 'postgresql'
                }
            };
        } catch (error) {
            const latencyMs = Date.now() - startTime;
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                latencyMs,
                details: {
                    connection: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }

    /**
     * Check Pesapal payment gateway reachability
     */
    async checkPaymentGateway(): Promise<HealthStatus> {
        const startTime = Date.now();

        if (!this.pesapalAdapter) {
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                details: {
                    connection: 'not_configured',
                    note: 'Pesapal adapter not available'
                }
            };
        }

        try {
            const pesapalUrl = process.env.PESAPAL_URL || 'https://cybqa.pesapal.com/pesapalv3';
            const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
            const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || process.env.PESAPAL_SECRET_KEY;

            if (!consumerKey || !consumerSecret) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date(),
                    details: {
                        connection: 'not_configured',
                        error: 'Pesapal consumer credentials are not configured'
                    }
                };
            }

            const response = await fetch(`${pesapalUrl}/api/Auth/RequestToken`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consumer_key: consumerKey,
                    consumer_secret: consumerSecret
                }),
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            const latencyMs = Date.now() - startTime;

            if (!response.ok) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date(),
                    latencyMs,
                    details: {
                        connection: 'failed',
                        error: `HTTP ${response.status}: ${response.statusText}`
                    }
                };
            }

            return {
                status: 'healthy',
                timestamp: new Date(),
                latencyMs,
                details: {
                    connection: 'successful',
                    provider: 'pesapal',
                    environment: /cybqa|sandbox/i.test(pesapalUrl) ? 'sandbox' : 'production'
                }
            };
        } catch (error) {
            const latencyMs = Date.now() - startTime;
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                latencyMs,
                details: {
                    connection: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }

    /**
     * Check messaging system (Kafka)
     */
    async checkMessaging(): Promise<HealthStatus> {
        try {
            return {
                status: 'healthy',
                timestamp: new Date(),
                details: {
                    connection: 'successful',
                    type: 'in-memory',
                    note: 'Using monolithic in-memory event bus'
                }
            };
        } catch (error) {

            return {
                status: 'unhealthy',
                timestamp: new Date(),
                details: {
                    connection: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }

    /**
     * Check cache system (Redis)
     */
    async checkCache(): Promise<HealthStatus> {
        const startTime = Date.now();
        
        if (!this.redisClient) {
            return {
                status: 'healthy',
                timestamp: new Date(),
                details: {
                    connection: 'not_configured',
                    note: 'Redis not configured'
                }
            };
        }

        try {
            await Promise.race([
                this.redisClient.ping(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
            ]);
            
            const latencyMs = Date.now() - startTime;
            return {
                status: 'healthy',
                timestamp: new Date(),
                latencyMs,
                details: {
                    connection: 'successful',
                    type: 'redis'
                }
            };
        } catch (error) {
            const latencyMs = Date.now() - startTime;
            return {
                status: 'unhealthy',
                timestamp: new Date(),
                latencyMs,
                details: {
                    connection: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }

    /**
     * Run all health checks and aggregate results
     */
    async checkAll(): Promise<AggregateHealthStatus> {
        const [database, paymentGateway, messaging, cache] = await Promise.all([
            this.checkDatabase(),
            this.checkPaymentGateway(),
            this.checkMessaging(),
            this.checkCache()
        ]);

        // Determine overall status
        // Critical dependencies: database, paymentGateway
        // Non-critical: messaging, cache (stubs)
        const criticalDependencies = [database, paymentGateway];
        const allDependencies = [database, paymentGateway, messaging, cache];

        const hasCriticalFailure = criticalDependencies.some(dep => dep.status === 'unhealthy');
        const hasAnyFailure = allDependencies.some(dep => dep.status === 'unhealthy');

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
        if (hasCriticalFailure) {
            overallStatus = 'unhealthy';
        } else if (hasAnyFailure) {
            overallStatus = 'degraded';
        } else {
            overallStatus = 'healthy';
        }

        return {
            status: overallStatus,
            service: 'payment-service',
            timestamp: new Date(),
            uptime: `${Math.floor(process.uptime())}s`,
            dependencies: {
                database,
                paymentGateway,
                messaging,
                cache
            }
        };
    }

    /**
     * Check readiness - critical dependencies only (DB, cache, messaging)
     */
    async checkReadiness(): Promise<{ ready: boolean; checks: Record<string, HealthStatus> }> {
        const [database, cache, messaging] = await Promise.all([
            this.checkDatabase(),
            this.checkCache(),
            this.checkMessaging()
        ]);

        const ready = database.status === 'healthy' && 
                     (cache.status === 'healthy' || !this.redisClient) && 
                     messaging.status === 'healthy';

        return {
            ready,
            checks: {
                database,
                cache,
                messaging
            }
        };
    }

    /**
     * Check liveness - basic process health
     */
    checkLiveness(): { alive: boolean; uptime: string; memory: any } {
        const memUsage = process.memoryUsage();

        return {
            alive: true,
            uptime: `${Math.floor(process.uptime())}s`,
            memory: {
                rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
            }
        };
    }
}

