# Maysar Data Retention Registry

**Document ID:** MAY-ENG-DATA-002  
**Version:** 1.0  
**Status:** Proposed — Pre-Launch Adoption  
**Owner:** Maysar Engineering  
**Related Constitution:** MAYSAR_INFRASTRUCTURE_CONSTITUTION.md (Article VII — Retention Policy)  
**Related Standard:** DATA_CLASSIFICATION_STANDARD.md

---

## 1. Purpose

This registry defines the retention policy for every table in the Maysar PostgreSQL database. Every table classified in DATA_CLASSIFICATION_STANDARD.md must have a corresponding entry here. No automated cleanup job may execute without a corresponding entry in this registry.

---

## 2. Retention Policy Schema

Each table entry must specify:

| Field | Meaning |
|-------|---------|
| Table | Database table name |
| Classification | C1–C5 from DATA_CLASSIFICATION_STANDARD.md |
| Retention Period | How long data is retained (time or event-based) |
| Retention Trigger | Event that starts the retention clock |
| Disposal Action | Delete, anonymize, archive, or retain indefinitely |
| Dependencies | Foreign keys or business references that must be checked first |
| Legal Hold Support | Whether deletion can be suspended by legal hold |
| Owner | Data owner responsible for the policy |
| Approval | Date and approver of the policy |

---

## 3. Retention Registry by Domain

### 3.1 Identity & Auth

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| users | C2 | 7 years after account deletion | Account deletion | Anonymize PII, retain audit trail | Orders, shipments, KYC records | Yes | Engineering Lead (Security) |
| user_profiles | C2 | 7 years after account deletion | Account deletion | Anonymize | users table | Yes | Engineering Lead (Security) |
| sessions | C4 | 30 days | Last activity | Delete | users table | No | Engineering Lead (Security) |
| password_resets | C4 | 24 hours | Creation | Delete | users table | No | Engineering Lead (Security) |
| email_verifications | C4 | 7 days | Creation | Delete | users table | No | Engineering Lead (Security) |
| two_factor_tokens | C4 | 30 days | Creation | Delete | users table | No | Engineering Lead (Security) |
| role_requests | C2 | 3 years after resolution | Resolution | Archive | users table | Yes | Engineering Lead (Security) |
| audit_logs | C1 | 7 years | Creation | Archive | Multiple tables | Yes | Security Engineer |

### 3.2 Business Registry & KYC

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| businesses | C2 | 7 years after closure | Business closure | Archive | business_documents | Yes | Business Operations Lead |
| business_documents | C1 | 7 years after business closure | Document upload | Archive | businesses table | Yes | Business Operations Lead |
| business_verifications | C2 | 7 years after verification | Verification completion | Archive | businesses table | Yes | Business Operations Lead |
| kyc_documents | C1 | 7 years after user deletion | Document upload | Archive | users table | Yes | Security Engineer |
| kyc_audit_log | C1 | 7 years | Creation | Archive | kyc_documents | Yes | Security Engineer |
| business_roles | C2 | 7 years after role removal | Role removal | Archive | businesses table | Yes | Business Operations Lead |

### 3.3 Catalog & Products

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| products | C2 | 3 years after deactivation | Product deactivation | Archive | product_variants, inventory | Yes | Catalog Product Manager |
| product_variants | C2 | 3 years after deactivation | Variant deactivation | Archive | products table | Yes | Catalog Product Manager |
| categories | C2 | 3 years after deactivation | Category deactivation | Archive | products table | Yes | Catalog Product Manager |
| product_images | C3 | 2 years after product deactivation | Product deactivation | Archive | products table | Yes | Catalog Product Manager |
| product_reviews | C3 | 3 years after review submission | Review submission | Archive | products table, users table | No | Catalog Product Manager |
| product_moderation | C3 | 3 years after moderation action | Moderation action | Archive | products table | No | Catalog Product Manager |
| seller_storefronts | C2 | 3 years after seller deactivation | Seller deactivation | Archive | users table | Yes | Catalog Product Manager |
| listing_drafts | C4 | 30 days after last edit | Last edit | Delete | products table | No | Catalog Product Manager |

### 3.4 Checkout & Orders

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| orders | C1 | 7 years | Order completion | Archive | order_items, shipments, payments | Yes | Commerce Engineering Lead |
| order_items | C1 | 7 years | Order completion | Archive | orders table | Yes | Commerce Engineering Lead |
| transactions | C1 | 7 years | Transaction completion | Archive | orders table | Yes | Finance & Payments Lead |
| shipments | C2 | 3 years after delivery | Delivery completion | Archive | orders table | Yes | Commerce Engineering Lead |
| carts | C4 | 30 days | Last activity | Delete | users table | No | Commerce Engineering Lead |
| checkout_sessions | C4 | 7 days | Last activity | Delete | orders table | No | Commerce Engineering Lead |
| disputes | C1 | 7 years after resolution | Resolution | Archive | orders table | Yes | Commerce Engineering Lead |
| restrictions | C2 | 3 years after expiry | Restriction expiry | Archive | users table, orders table | Yes | Commerce Engineering Lead |

### 3.5 Payments & Wallet

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| wallet_transactions | C1 | 7 years | Transaction completion | Archive | users table | Yes | Finance & Payments Lead |
| wallet_holds | C1 | 7 years | Hold release | Archive | wallet_transactions | Yes | Finance & Payments Lead |
| payouts | C1 | 7 years | Payout completion | Archive | users table | Yes | Finance & Payments Lead |
| commissions | C1 | 7 years | Commission accrual | Archive | users table, orders table | Yes | Finance & Payments Lead |
| payment_refunds | C1 | 7 years | Refund completion | Archive | transactions table | Yes | Finance & Payments Lead |
| payment_webhooks | C3 | 1 year | Webhook receipt | Archive | transactions table | No | Finance & Payments Lead |
| idempotency_keys | C4 | 30 days | Key creation | Delete | N/A | No | Finance & Payments Lead |

### 3.6 Logistics

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| shipments | C2 | 3 years after delivery | Delivery completion | Archive | orders table | Yes | Commerce Engineering Lead |
| delivery_jobs | C2 | 3 years after completion | Job completion | Archive | shipments table | Yes | Logistics Operations Lead |
| vehicle_tariffs | C3 | 5 years | Tariff expiration | Archive | N/A | Yes | Logistics Operations Lead |
| location_history | C3 | 90 days | Location record | Delete | delivery_jobs | Yes | Logistics Operations Lead |
| inventory | C2 | 3 years after stockout | Stock depletion | Archive | products table | Yes | Logistics Operations Lead |
| inventory_reservations | C2 | 1 year after release | Reservation release | Archive | inventory table | Yes | Logistics Operations Lead |
| stock_counts | C3 | 2 years | Count date | Archive | inventory table | Yes | Logistics Operations Lead |
| fulfillment_commitments | C2 | 3 years after fulfillment | Commitment fulfillment | Archive | orders table | Yes | Logistics Operations Lead |
| fulfillment_cost_adjustments | C1 | 7 years | Adjustment creation | Archive | shipments table | Yes | Logistics Operations Lead |

### 3.7 Community & Notifications

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| posts | C3 | 3 years after deletion | Post deletion | Archive | users table | No | Community Product Manager |
| comments | C3 | 3 years after deletion | Comment deletion | Archive | posts table, users table | No | Community Product Manager |
| likes | C3 | 2 years | Like creation | Delete | posts table, users table | No | Community Product Manager |
| notifications | C4 | 30 days | Notification creation | Delete | users table | No | Community Product Manager |
| notification_preferences | C2 | 3 years after user deletion | Account deletion | Archive | users table | Yes | Community Product Manager |
| discussion_threads | C3 | 3 years after thread closure | Thread closure | Archive | users table | No | Community Product Manager |
| community_articles | C3 | 3 years after article deactivation | Article deactivation | Archive | users table | No | Community Product Manager |
| seller_storefronts | C2 | 3 years after seller deactivation | Seller deactivation | Archive | users table | Yes | Catalog Product Manager |

### 3.8 Enabler & Reseller

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| enabler_profiles | C2 | 3 years after deactivation | Profile deactivation | Archive | users table | Yes | Enabler Program Manager |
| enabler_earnings | C1 | 7 years | Earnings accrual | Archive | users table | Yes | Enabler Program Manager |
| enabler_tasks | C2 | 3 years after task completion | Task completion | Archive | users table | Yes | Enabler Program Manager |
| seller_authorizations | C2 | 3 years after revocation | Authorization revocation | Archive | users table, businesses table | Yes | Enabler Program Manager |
| promotion_offers | C3 | 2 years after expiration | Offer expiration | Archive | users table | Yes | Enabler Program Manager |
| customer_links | C3 | 1 year after last use | Last use | Delete | users table | No | Enabler Program Manager |
| enforcement_actions | C1 | 7 years | Action creation | Archive | users table | Yes | Enabler Program Manager |



### 3.9 Sourcing & Maysar Request

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| sourcing_requests | C2 | 3 years after request closure | Request closure | Archive | users table | Yes | Procurement Operations Lead |
| sourcing_messages | C3 | 2 years after message | Message creation | Archive | sourcing_requests | Yes | Procurement Operations Lead |
| sourcing_assessments | C2 | 3 years after assessment | Assessment completion | Archive | sourcing_requests | Yes | Procurement Operations Lead |
| sourcing_quotes | C2 | 3 years after quote expiration | Quote expiration | Archive | sourcing_requests | Yes | Procurement Operations Lead |
| supplier_profiles | C2 | 3 years after deactivation | Profile deactivation | Archive | users table | Yes | Procurement Operations Lead |
| purchase_orders | C1 | 7 years | Order completion | Archive | sourcing_requests | Yes | Procurement Operations Lead |

### 3.10 Analytics, SMS & Shared Events

| Table | Classification | Retention Period | Retention Trigger | Disposal Action | Dependencies | Legal Hold | Owner |
|-------|---------------|-----------------|-------------------|-----------------|--------------|------------|-------|
| analytics_events | C3 | 2 years | Event creation | Archive | users table | Yes | Data Analytics Lead |
| analytics_metrics | C3 | 2 years | Metric computation | Archive | N/A | Yes | Data Analytics Lead |
| sms_messages | C3 | 1 year | Message send | Archive | users table | Yes | Data Analytics Lead |
| shared_outbox_events | C3 | 1 year after successful delivery | Event publication | Archive | N/A | No | Data Analytics Lead |
| event_store | C3 | 2 years | Event creation | Archive | N/A | Yes | Data Analytics Lead |
| saga_dead_letters | C2 | 1 year | Dead letter creation | Archive | N/A | Yes | Data Analytics Lead |

---

## 4. Retention Policy Change Procedure

1. Domain owner submits retention change request
2. Legal reviews for statutory compliance
3. Security reviews for access implications
4. Engineering Lead approves or rejects
5. DATA_RETENTION_REGISTRY.md updated
6. Automated cleanup jobs updated if applicable
7. Change logged with date and approver

---

## 8. Related Documents

- `MAYSAR_INFRASTRUCTURE_CONSTITUTION.md` — Article VII (Retention Policy)
- `DATA_CLASSIFICATION_STANDARD.md` — Classification definitions
- `DATABASE_STORAGE_MANAGEMENT_STANDARD.md` — Storage handling per classification
- `DATABASE_DELETION_STANDARD.md` — Deletion rules per classification
- `DATABASE_ARCHIVAL_STANDARD.md` — Archival standards
- `DATABASE_LIFECYCLE_OPERATIONS_RUNBOOK.md` — Operational procedures

---

**End of Document**

