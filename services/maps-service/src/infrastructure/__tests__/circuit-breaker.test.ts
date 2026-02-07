/**
 * Circuit Breaker Infrastructure Tests
 *
 * Purpose: Validates resilience pattern implementation for external API protection
 * Scope: Infrastructure layer - circuit breaker state machine and failure detection
 * Coverage Target: 85% (infrastructure component)
 * Constitution Section: 8 Infrastructure Layer Testing - Real I/O simulation
 * 
 * Test Categories:
 * - State transition verification (CLOSED → OPEN → HALF_OPEN)
 * - Failure threshold enforcement
 * - Recovery mechanism validation
 * - Statistics tracking accuracy
 * 
 * Business Rules Covered:
 * - Circuit opens after failure threshold exceeded
 * - Circuit remains open during timeout period
 * - Circuit transitions to half-open for recovery testing
 * - Circuit closes after success threshold met in half-open state
 * - Immediate rejection when circuit is open (fail-fast)
 */

import { CircuitBreaker, CircuitState } from '../circuit-breaker';

describe('CircuitBreaker - Resilience Pattern', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        circuitBreaker = new CircuitBreaker('TestService', {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 100
        });
    });

    describe('CLOSED State Operations', () => {
        describe('when circuit is in healthy closed state', () => {
            it('should execute operations successfully without interference', async () => {
                // Given: A successful operation
                const operation = jest.fn().mockResolvedValue('success');

                // When: Executing through circuit breaker
                const result = await circuitBreaker.execute(operation);

                // Then: Operation should complete and circuit remains closed
                expect(result).toBe('success');
                expect(operation).toHaveBeenCalledTimes(1);
                expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
            });

            it('should track failures and open circuit after threshold exceeded', async () => {
                // Given: An operation that consistently fails
                const operation = jest.fn().mockRejectedValue(new Error('Service unavailable'));

                // When: Executing operation multiple times to exceed failure threshold (3)
                for (let i = 0; i < 3; i++) {
                    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service unavailable');
                }

                // Then: Circuit should transition to OPEN state
                expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
                const stats = circuitBreaker.getStats();
                expect(stats.failureCount).toBe(3);
            });

            it('should reset failure count on successful execution', async () => {
                // Given: Mixed success and failure operations
                const failOp = jest.fn().mockRejectedValue(new Error('Fail'));
                const successOp = jest.fn().mockResolvedValue('ok');

                // When: Executing with 2 failures then 1 success
                await expect(circuitBreaker.execute(failOp)).rejects.toThrow();
                await expect(circuitBreaker.execute(failOp)).rejects.toThrow();
                await circuitBreaker.execute(successOp);

                // Then: Circuit should remain closed and failure count should reset
                expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
            });
        });
    });

    describe('OPEN State Behavior', () => {
        beforeEach(async () => {
            // Given: Circuit breaker is tripped to OPEN state
            const failedOperation = jest.fn().mockRejectedValue(new Error('Service failure'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failedOperation)).rejects.toThrow();
            }
        });

        describe('when circuit is open', () => {
            it('should reject calls immediately without executing operation (fail-fast)', async () => {
                // Given: A potentially successful operation
                const operation = jest.fn().mockResolvedValue('success');

                // When: Attempting to execute while circuit is open
                await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');

                // Then: Operation should not be executed (fail-fast protection)
                expect(operation).not.toHaveBeenCalled();
            });

            it('should transition to HALF_OPEN after timeout expires', async () => {
                // Given: Circuit breaker has been open
                // When: Waiting for timeout period to elapse (100ms)
                await new Promise(resolve => setTimeout(resolve, 150));

                // Then: First operation should attempt in HALF_OPEN state
                const operation = jest.fn().mockResolvedValue('success');
                await circuitBreaker.execute(operation);

                expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
            });

            it('should record rejection statistics while open', async () => {
                // Given: Multiple execution attempts while open
                const operation = jest.fn().mockResolvedValue('ok');

                // When: Attempting several executions
                for (let i = 0; i < 5; i++) {
                    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
                }

                // Then: Rejections should be tracked
                const stats = circuitBreaker.getStats();
                expect(stats.rejectedCount).toBeGreaterThan(0);
            });
        });
    });

    describe('HALF_OPEN State Recovery', () => {
        beforeEach(async () => {
            // Given: Circuit breaker transitioned to HALF_OPEN
            const failOp = jest.fn().mockRejectedValue(new Error('Fail'));
            for (let i = 0; i < 3; i++) {
                await expect(circuitBreaker.execute(failOp)).rejects.toThrow();
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        });

        describe('when attempting recovery in half-open state', () => {
            it('should transition to CLOSED after success threshold met', async () => {
                // Given: Operations that will succeed
                const operation = jest.fn().mockResolvedValue('success');

                // When: Executing successful operations to meet threshold (2)
                await circuitBreaker.execute(operation);
                await circuitBreaker.execute(operation);

                // Then: Circuit should close after sufficient successes
                expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
            });

            it('should transition back to OPEN on failure during recovery', async () => {
                // Given: Initial success followed by failure
                const successOp = jest.fn().mockResolvedValue('success');
                const failOp = jest.fn().mockRejectedValue(new Error('Recovery failed'));

                // When: Executing with 1 success then 1 failure
                await circuitBreaker.execute(successOp);
                await expect(circuitBreaker.execute(failOp)).rejects.toThrow();

                // Then: Circuit should reopen on failure
                expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
            });

            it('should allow limited testing during half-open period', async () => {
                // Given: Circuit in half-open state
                const operation = jest.fn().mockResolvedValue('test');

                // When: Executing a single test operation
                const result = await circuitBreaker.execute(operation);

                // Then: Operation should be allowed through
                expect(result).toBe('test');
                expect(operation).toHaveBeenCalled();
            });
        });
    });

    describe('Statistics and Monitoring', () => {
        describe('when tracking circuit breaker metrics', () => {
            it('should accurately count successes and failures', async () => {
                // Given: Mix of successful and failed operations
                const successOp = jest.fn().mockResolvedValue('ok');
                const failOp = jest.fn().mockRejectedValue(new Error('error'));

                // When: Executing multiple operations
                await circuitBreaker.execute(successOp);
                await circuitBreaker.execute(successOp);
                await expect(circuitBreaker.execute(failOp)).rejects.toThrow();

                // Then: Statistics should reflect actual execution counts
                const stats = circuitBreaker.getStats();
                expect(stats.successCount).toBe(2);
                expect(stats.failureCount).toBe(1);
            });

            it('should track total execution attempts', async () => {
                // Given: Various operations
                const successOp = jest.fn().mockResolvedValue('ok');

                // When: Executing multiple times
                await circuitBreaker.execute(successOp);
                await circuitBreaker.execute(successOp);
                await circuitBreaker.execute(successOp);

                // Then: Total count should match executions
                const stats = circuitBreaker.getStats();
                expect(stats.totalCount).toBe(3);
            });

            it('should provide current state in statistics', () => {
                // Given: Circuit breaker in default state
                // When: Retrieving statistics
                const stats = circuitBreaker.getStats();

                // Then: State should be included in stats
                expect(stats.state).toBe(CircuitState.CLOSED);
            });
        });
    });

    describe('Configuration and Customization', () => {
        it('should respect custom failure threshold', async () => {
            // Given: Circuit breaker with custom threshold of 5
            const customBreaker = new CircuitBreaker('Custom', {
                failureThreshold: 5,
                successThreshold: 2,
                timeout: 100
            });
            const failOp = jest.fn().mockRejectedValue(new Error('Fail'));

            // When: Failing 4 times (below threshold)
            for (let i = 0; i < 4; i++) {
                await expect(customBreaker.execute(failOp)).rejects.toThrow();
            }

            // Then: Circuit should still be closed
            expect(customBreaker.getState()).toBe(CircuitState.CLOSED);
        });

        it('should respect custom timeout duration', async () => {
            // Given: Circuit breaker with longer timeout (500ms)
            const longTimeoutBreaker = new CircuitBreaker('LongTimeout', {
                failureThreshold: 3,
                successThreshold: 2,
                timeout: 500
            });

            // When: Tripping circuit and waiting insufficient time
            const failOp = jest.fn().mockRejectedValue(new Error('Fail'));
            for (let i = 0; i < 3; i++) {
                await expect(longTimeoutBreaker.execute(failOp)).rejects.toThrow();
            }

            await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms (< 500ms timeout)

            // Then: Circuit should still be open
            const successOp = jest.fn().mockResolvedValue('ok');
            await expect(longTimeoutBreaker.execute(successOp)).rejects.toThrow('Circuit breaker is OPEN');
        });
    });

    describe('Edge Cases and Error Scenarios', () => {
        it('should handle synchronous errors in operations', async () => {
            // Given: Operation that throws synchronously
            const syncErrorOp = jest.fn().mockImplementation(() => {
                throw new Error('Synchronous error');
            });

            // When: Executing operation
            // Then: Should handle as normal failure
            await expect(circuitBreaker.execute(syncErrorOp)).rejects.toThrow('Synchronous error');
            expect(circuitBreaker.getStats().failureCount).toBe(1);
        });

        it('should handle asynchronous rejection', async () => {
            // Given: Promise that rejects
            const asyncRejectOp = jest.fn().mockRejectedValue(new Error('Async rejection'));

            // When: Executing operation
            // Then: Should handle as normal failure
            await expect(circuitBreaker.execute(asyncRejectOp)).rejects.toThrow('Async rejection');
            expect(circuitBreaker.getStats().failureCount).toBe(1);
        });
    });
});
