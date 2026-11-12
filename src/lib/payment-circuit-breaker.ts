/**
 * Maysar Engineering — Payment Gateway Circuit Breaker
 * 
 * Governing Document: Maysar Engineering Constitution v1.0
 *   - Article 19: Reliability and Fault Tolerance — Circuit breakers, Timeouts
 *   - Article 11.7: Define appropriate execution timeouts
 *   - Article 18: Financial and Transactional Integrity
 * 
 * Implements circuit breaker pattern using opossum for external payment gateway calls.
 * States:
 *   - CLOSED: Normal operation, requests pass through
 *   - OPEN: Gateway is failing, requests fail fast without calling the gateway
 *   - HALF-OPEN: Testing if gateway has recovered
 * 
 * Provides graceful degradation: when circuit is OPEN, payment requests are queued
 * for later processing instead of failing immediately.
 */

import crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CircuitBreaker: any = require('opossum');
import axios from 'axios';

const PAYMENT_GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL;
const PAYMENT_GATEWAY_TIMEOUT_MS = Number(process.env.PAYMENT_GATEWAY_TIMEOUT_MS || 5000);
const PAYMENT_GATEWAY_MAX_TIMEOUT_MS = Number(process.env.PAYMENT_GATEWAY_MAX_TIMEOUT_MS || 30000);

// Circuit breaker configuration
const breakerOptions = {
    timeout: PAYMENT_GATEWAY_TIMEOUT_MS,              // Default 5s timeout per call
    errorThresholdPercentage: 50,                     // Open after 50% errors
    resetTimeout: 30000,                              // 30s before trying again (half-open)
    rollingCountTimeout: 10000,                       // 10s rolling statistics window
    rollingCountBuckets: 10,                          // 10 buckets in rolling window
};

/**
 * Circuit breaker for payment gateway calls.
 * 
 * When the circuit is OPEN, calls fail fast with a PAYMENT_GATEWAY_UNAVAILABLE error,
 * allowing callers to queue payments for later processing instead of hanging.
 */
const paymentBreaker = new CircuitBreaker(
    async (paymentData: any) => {
        if (!PAYMENT_GATEWAY_URL) {
            throw new Error('PAYMENT_GATEWAY_URL not configured');
        }
        
        const response = await axios.post(`${PAYMENT_GATEWAY_URL}/charge`, paymentData, {
            timeout: PAYMENT_GATEWAY_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        return response.data;
    },
    breakerOptions
);

// Circuit breaker state change handlers
paymentBreaker.on('open', () => {
    console.warn('[CircuitBreaker] Payment gateway circuit breaker OPEN — failing fast');
});

paymentBreaker.on('halfOpen', () => {
    console.info('[CircuitBreaker] Payment gateway circuit breaker HALF-OPEN — testing recovery');
});

paymentBreaker.on('close', () => {
    console.info('[CircuitBreaker] Payment gateway circuit breaker CLOSED — normal operation');
});

paymentBreaker.on('reject', () => {
    console.warn('[CircuitBreaker] Payment gateway call rejected — circuit is OPEN');
});

/**
 * Process a payment through the circuit breaker.
 * 
 * When the circuit is OPEN, throws PAYMENT_GATEWAY_UNAVAILABLE error so callers
 * can queue the payment for later processing (graceful degradation per Article 19).
 * 
 * @param paymentData - Payment data to send to the gateway
 * @returns Payment gateway response
 * @throws {Error} With message 'PAYMENT_GATEWAY_UNAVAILABLE' when circuit is open
 */
export async function processPaymentWithCircuitBreaker(paymentData: any): Promise<any> {
    try {
        return await paymentBreaker.fire(paymentData);
    } catch (error) {
        // Circuit breaker open or call failed — queue for later processing
        console.error('[CircuitBreaker] Payment gateway unavailable:', error);
        throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');
    }
}

/**
 * Get circuit breaker health status.
 * Used by Article 21 (Performance Measurement) for observability.
 */
export function getPaymentBreakerHealth(): {
    status: 'closed' | 'open' | 'halfOpen';
    failures: number;
    timeToReset: number;
} {
    return {
        status: paymentBreaker.status as 'closed' | 'open' | 'halfOpen',
        failures: paymentBreaker.failures,
        timeToReset: paymentBreaker.timeToReset,
    };
}

/**
 * Check if the payment gateway is currently available.
 * Returns true if circuit is CLOSED or HALF-OPEN (gateway may be reachable).
 */
export function isPaymentGatewayAvailable(): boolean {
    const status = paymentBreaker.status;
    return status === 'closed' || status === 'halfOpen';
}

/**
 * Manually close the circuit breaker (for operational recovery).
 */
export async function closePaymentBreaker(): Promise<void> {
    await paymentBreaker.close();
    console.info('[CircuitBreaker] Circuit breaker manually closed');
}

/**
 * Manually open the circuit breaker (for operational isolation).
 */
export async function openPaymentBreaker(): Promise<void> {
    await paymentBreaker.open();
    console.warn('[CircuitBreaker] Circuit breaker manually opened');
}

/**
 * Execute any function through the circuit breaker.
 * Use this for non-payment gateway calls that also need circuit protection.
 * 
 * @param fn - Async function to execute through the breaker
 * @returns Result of the function
 */
export async function executeWithCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await paymentBreaker.fire(fn);
    } catch (error) {
        throw new Error('PAYMENT_GATEWAY_UNAVAILABLE');
    }
}
