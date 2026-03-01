# Fraud Scoring System

This document outlines the thresholds, weights, and policies for the global fraud scoring system.

## Risk Score Thresholds
(*Source: FraudEngine*)

| Score Range | Risk Level | Recommendation |
|---|---|---|
| 0 – 29 | `low` | `approve` |
| 30 – 59 | `medium` | `approve` |
| 60 – 79 | `high` | `review` |
| 80 – 89 | `critical` | `review` |
| 90 – 100 | `critical` | `decline` |

## Action Thresholds
(*Source: FraudPreventionPolicy*)

| Threshold | Value | Action |
|---|---|---|
| `MANUAL_REVIEW_THRESHOLD` | 60 | Route to manual review queue |
| `AUTO_DECLINE_THRESHOLD` | 85 | Auto-decline, flag for review |
| `BLOCK_USER_THRESHOLD` | 95 | Block user account |

## Flag Weights
(*Source: FraudEngine*)

| Flag Type | Severity | Weight |
|---|---|---|
| `impossible_travel` | critical | 40 |
| `high_risk_device` | high | 30 |
| `high_frequency` | high | 25 |
| `high_amount_velocity` | medium | 20 |
| `unusual_amount` | medium | 15 |
| `high_risk_country` | medium | 15 |
| `new_payment_method` | medium | 12 |
| `new_device` | medium | 10 |
| `unusual_time` | low | 8 |
| `round_amount` | low | 5 |

## Velocity Limits
(*Source: FraudEngine.getVelocityLimit*)

| Window | Max Count | Max Amount |
|---|---|---|
| 5 minutes | 5 | 1,000 |
| 1 hour | 20 | 5,000 |
| 1 day | 50 | 20,000 |

## Cooling-Off Periods
(*Source: FraudPreventionPolicy.getCoolingOffPeriod*)

| Score Range | Cooling-Off |
|---|---|
| 60 – 79 | 24 hours |
| 80 – 89 | 48 hours |
| ≥ 90 | 72 hours |

## System-Wide Policies

**Commission Protection Policy**
- `CommissionProtectionPolicy.FRAUD_THRESHOLD = 80`
- Blocks commission payout processing for users above this risk threshold.

**User Security Policy**
- `>50` blocks high-value operations
- `>80` blocks sensitive operations (e.g. password resets, PII updates)
