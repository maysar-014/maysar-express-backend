/**
 * Health Check Service
 * Infrastructure layer for checking service dependencies
 */

import { PrismaClient } from '@prisma/client';
import { PesapalAdapter } from '../providers/pesapal.adapter';
import { KafkaEventBus } from '../messaging/kafka.event-bus';

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
        private readonly kafkaEventBus?: KafkaEventBus
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
            // Attempt to get access token as a health check
            // This validates credentials and API reachability
            const pesapalUrl = process.env.PESAPAL_URL || 'https://cybqa.pesapal.com/pesapalv3';
            const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
            const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

            if (!consumerKey || !consumerSecret) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date(),
                    details: {
                        connection: 'not_configured',
                        error: 'Pesapal credentials not configured'
                    }
                };
            }

            const response = await fetch(`${pesapalUrl}/api/Auth/RequestToken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consumer_key: consumerKey,
                    consumer_secret: consumerSecret,
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

            const result = await response.json();

            if (!result.token) {
                return {
                    status: 'unhealthy',
                    timestamp: new Date(),
                    latencyMs,
                    details: {
                        connection: 'failed',
                        error: 'No token in response'
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
                    environment: pesapalUrl.includes('cybqa') ? 'sandbox' : 'production'
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
            // TODO: Implement actual Kafka health check when fully implemented
            // For now, return healthy as messaging is not yet fully implemented
            // In production, this would check Kafka broker connectivity
            return {
                status: 'healthy',
                timestamp: new Date(),
                details: {
                    connection: 'not_implemented',
                    note: 'Kafka health check not yet implemented - stub only'
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
        try {
            // TODO: Implement actual cache health check when implemented
            // For now, return healthy as cache is not yet implemented
            // In production, this would check Redis connectivity with PING command
            return {
                status: 'healthy',
                timestamp: new Date(),
                details: {
                    connection: 'not_implemented',
                    note: 'Cache health check not yet implemented - stub only'
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
     * Check readiness - critical dependencies only
     */
    async checkReadiness(): Promise<{ ready: boolean; checks: Record<string, HealthStatus> }> {
        const [database, paymentGateway] = await Promise.all([
            this.checkDatabase(),
            this.checkPaymentGateway()
        ]);

        const ready = database.status === 'healthy' && paymentGateway.status === 'healthy';

        return {
            ready,
            checks: {
                database,
                paymentGateway
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
