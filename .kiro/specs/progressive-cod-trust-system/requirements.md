# Requirements Document

## Introduction

The Progressive COD Trust System replaces the current fixed "3 successful orders" Cash-on-Delivery eligibility rule with a dynamic, score-based trust model. Instead of a binary gate, buyers receive a COD Eligibility Score (0–100) that grows with positive trust signals and shrinks with negative ones. The score determines which COD tier a buyer belongs to, and each tier carries its own order-value cap, geographic constraints, and concurrency limits.

This system is designed for the Tanzania/East Africa market where COD is the primary trust bridge for new online shoppers. It removes onboarding friction for first-time buyers while protecting the platform from fraud and non-delivery risk. The same trust infrastructure is designed to power future products such as BNPL, supplier credit, merchant financing, and logistics insurance.

The new `CODEligibilityEngine` must preserve the existing interface (`checkBuyerEligibility`, `checkSellerEligibility`, `checkOrderEligibility`) so that `PlaceOrderUseCase` requires no structural changes.

---

## Glossary

- **COD**: Cash on Delivery — a payment method where the buyer pays the courier in cash upon receiving the order.
- **COD_Eligibility_Score**: An integer in the range 0–100 representing a buyer's accumulated trust level for COD transactions.
- **Trust_Engine**: The domain component responsible for computing and updating the COD_Eligibility_Score.
- **Trust_Signal**: A measurable buyer behaviour or attribute that positively or negatively influences the COD_Eligibility_Score.
- **Trust_Tier**: One of three named bands (New_Buyer, Trusted_Beginner, Trusted_Buyer) derived from the COD_Eligibility_Score.
- **New_Buyer**: Trust_Tier for buyers with a COD_Eligibility_Score of 0–20.
- **Trusted_Beginner**: Trust_Tier for buyers with a COD_Eligibility_Score of 21–40.
- **Trusted_Buyer**: Trust_Tier for buyers with a COD_Eligibility_Score of 41–100.
- **COD_Limit**: The maximum order value (in TZS) for which a buyer in a given Trust_Tier may use COD.
- **Active_COD_Order**: A COD order that has been placed and not yet delivered, cancelled, or refunded.
- **Courier_Report**: A structured record submitted by a courier after a delivery attempt, capturing outcome and buyer behaviour.
- **Dispute**: A formal complaint raised by a buyer or seller against an order.
- **Score_Repository**: The persistence component that stores and retrieves COD_Eligibility_Score records.
- **Score_Event**: An immutable record of a Trust_Signal event that contributed to a score change.
- **PlaceOrderUseCase**: The existing application use-case that orchestrates order creation and COD validation.
- **Temporary_Restriction**: A time-bounded suspension of COD access applied to a buyer regardless of their Trust_Tier.

---

## Requirements

### Requirement 1: COD Eligibility Score Model

**User Story:** As a platform operator, I want every buyer to have a persistent COD Eligibility Score, so that COD access decisions are based on accumulated trust rather than a fixed order count.

#### Acceptance Criteria

1. THE Trust_Engine SHALL maintain a COD_Eligibility_Score for every buyer, initialised to 0 at account creation.
2. THE Trust_Engine SHALL constrain the COD_Eligibility_Score to the integer range 0–100 at all times.
3. WHEN a Trust_Signal event is recorded, THE Trust_Engine SHALL update the buyer's COD_Eligibility_Score within 5 seconds of the event being persisted.
4. THE Score_Repository SHALL persist each COD_Eligibility_Score update as an immutable Score_Event containing the signal type, delta, resulting score, and UTC timestamp.
5. WHEN the COD_Eligibility_Score is requested for a buyer who has no prior record, THE Score_Repository SHALL return a score of 0.
6. FOR ALL valid sequences of Trust_Signal events applied to a buyer, THE Trust_Engine SHALL produce a COD_Eligibility_Score that equals the sum of all deltas clamped to [0, 100] — ensuring score computation is deterministic and reproducible from the Score_Event log (round-trip property).

---

### Requirement 2: Trust Tier Classification

**User Story:** As a platform operator, I want buyers to be automatically classified into trust tiers based on their score, so that COD limits and constraints are applied consistently.

#### Acceptance Criteria

1. WHEN the COD_Eligibility_Score is in the range 0–20 (inclusive), THE Trust_Engine SHALL classify the buyer as New_Buyer.
2. WHEN the COD_Eligibility_Score is in the range 21–40 (inclusive), THE Trust_Engine SHALL classify the buyer as Trusted_Beginner.
3. WHEN the COD_Eligibility_Score is in the range 41–100 (inclusive), THE Trust_Engine SHALL classify the buyer as Trusted_Buyer.
4. THE Trust_Engine SHALL re-evaluate the Trust_Tier every time the COD_Eligibility_Score changes.
5. FOR ALL COD_Eligibility_Score values in [0, 100], THE Trust_Engine SHALL assign exactly one Trust_Tier (no gaps, no overlaps).

---

### Requirement 3: Tier-Based COD Limits and Constraints

**User Story:** As a platform operator, I want each trust tier to enforce specific order-value caps, geographic constraints, and concurrency limits, so that risk exposure is proportional to demonstrated buyer trust.

#### Acceptance Criteria

1. WHILE a buyer is classified as New_Buyer, THE Trust_Engine SHALL set the COD_Limit to TZS 30,000.
2. WHILE a buyer is classified as New_Buyer, THE Trust_Engine SHALL restrict COD to deliveries within the same city as the seller.
3. WHILE a buyer is classified as New_Buyer, THE Trust_Engine SHALL allow a maximum of 1 Active_COD_Order at any time.
4. WHILE a buyer is classified as Trusted_Beginner, THE Trust_Engine SHALL set the COD_Limit to TZS 150,000.
5. WHILE a buyer is classified as Trusted_Buyer, THE Trust_Engine SHALL impose no COD_Limit (unrestricted order value).
6. WHILE a buyer is classified as Trusted_Buyer, THE Trust_Engine SHALL impose no geographic restriction on COD deliveries.
7. WHEN a COD order is placed and the order's total amount exceeds the buyer's COD_Limit, THE Trust_Engine SHALL return an ineligible result with a reason stating the applicable limit.
8. WHEN a New_Buyer already has 1 Active_COD_Order and attempts to place another COD order, THE Trust_Engine SHALL return an ineligible result citing the concurrency limit.

---

### Requirement 4: Trust Signal Ingestion

**User Story:** As a platform operator, I want the system to ingest multiple trust signals from across the platform, so that the COD Eligibility Score reflects real buyer behaviour comprehensively.

#### Acceptance Criteria

1. WHEN a COD order is confirmed as successfully delivered, THE Trust_Engine SHALL record a positive Trust_Signal of type `SUCCESSFUL_DELIVERY`.
2. WHEN a buyer cancels a COD order after it has been dispatched, THE Trust_Engine SHALL record a negative Trust_Signal of type `POST_DISPATCH_CANCELLATION`.
3. WHEN a buyer's phone number is verified, THE Trust_Engine SHALL record a positive Trust_Signal of type `PHONE_VERIFIED`.
4. WHEN a Courier_Report is submitted with outcome `REFUSED_DELIVERY`, THE Trust_Engine SHALL record a negative Trust_Signal of type `DELIVERY_REFUSED`.
5. WHEN a Dispute is resolved against the buyer (buyer at fault), THE Trust_Engine SHALL record a negative Trust_Signal of type `DISPUTE_LOST`.
6. WHEN a buyer's account reaches 180 days of age without suspension, THE Trust_Engine SHALL record a positive Trust_Signal of type `ACCOUNT_AGE_MILESTONE`.
7. WHEN a buyer completes a COD order with a value above TZS 100,000, THE Trust_Engine SHALL record a positive Trust_Signal of type `HIGH_VALUE_COMPLETION`.
8. THE Trust_Engine SHALL process each Trust_Signal type with a predefined score delta as specified in the Trust Signal Weight Table (see design document).
9. IF a Trust_Signal event is received for an unknown buyer ID, THEN THE Trust_Engine SHALL reject the event and return a descriptive error without modifying any score.

---

### Requirement 5: Score-Based Buyer Eligibility Check

**User Story:** As a buyer, I want my COD eligibility to be evaluated against my current trust score and tier, so that I can use COD immediately for low-value orders even as a new buyer.

#### Acceptance Criteria

1. WHEN `checkBuyerEligibility` is called, THE Trust_Engine SHALL retrieve the buyer's current COD_Eligibility_Score and derive the Trust_Tier.
2. WHEN a buyer has a Temporary_Restriction active, THE Trust_Engine SHALL return an ineligible result regardless of Trust_Tier or score.
3. WHEN a buyer's COD access has been permanently disabled by an operator, THE Trust_Engine SHALL return an ineligible result with reason `COD_PERMANENTLY_DISABLED`.
4. WHEN a buyer is classified as New_Buyer with no Temporary_Restriction and no permanent disable, THE Trust_Engine SHALL return an eligible result (allowing COD for low-value, same-city orders per Requirement 3).
5. THE Trust_Engine SHALL complete the `checkBuyerEligibility` call within 300ms under normal load conditions.
6. FOR ALL buyers with a COD_Eligibility_Score ≥ 0 and no active restrictions, THE Trust_Engine SHALL return a deterministic eligibility result given the same score and tier inputs (idempotence property).

---

### Requirement 6: Score-Aware Order Eligibility Check

**User Story:** As a platform operator, I want order-level COD eligibility to incorporate the buyer's trust tier alongside order value and geography, so that risk is assessed holistically at the point of purchase.

#### Acceptance Criteria

1. WHEN `checkOrderEligibility` is called, THE Trust_Engine SHALL validate the order's total amount against the buyer's tier-specific COD_Limit.
2. WHEN `checkOrderEligibility` is called for a New_Buyer, THE Trust_Engine SHALL validate that the delivery city matches the seller's city.
3. WHEN `checkOrderEligibility` is called for a New_Buyer, THE Trust_Engine SHALL validate that the buyer has no existing Active_COD_Order.
4. WHEN the order contains a product flagged as high-risk by the product catalogue, THE Trust_Engine SHALL return an ineligible result with reason `HIGH_RISK_ITEM`.
5. WHEN the delivery address is in an area where COD is not supported by logistics, THE Trust_Engine SHALL return an ineligible result with reason `UNSUPPORTED_AREA`.
6. IF any eligibility check fails, THEN THE Trust_Engine SHALL return a single ineligible result containing the first failing reason (fail-fast behaviour).
7. FOR ALL orders where all individual checks pass, THE Trust_Engine SHALL return an eligible result — ensuring no false negatives from check ordering (confluence property).

---

### Requirement 7: Temporary COD Restriction

**User Story:** As a platform operator, I want to temporarily restrict COD access for suspicious behaviour, so that high-score buyers cannot exploit their tier for fraudulent high-value orders.

#### Acceptance Criteria

1. WHEN an operator or automated fraud rule applies a Temporary_Restriction to a buyer, THE Trust_Engine SHALL record the restriction with a start time, end time, and reason.
2. WHILE a Temporary_Restriction is active, THE Trust_Engine SHALL return an ineligible result for all COD eligibility checks for that buyer.
3. WHEN the Temporary_Restriction end time has passed, THE Trust_Engine SHALL automatically lift the restriction and resume normal tier-based evaluation.
4. THE Trust_Engine SHALL support applying a Temporary_Restriction without modifying the buyer's COD_Eligibility_Score.
5. IF a Temporary_Restriction is applied to a buyer who already has an active restriction, THEN THE Trust_Engine SHALL extend the restriction to the later of the two end times.

---

### Requirement 8: Interface Compatibility with PlaceOrderUseCase

**User Story:** As a backend engineer, I want the new Trust_Engine to expose the same interface as the current CODEligibilityEngine, so that PlaceOrderUseCase requires no structural changes.

#### Acceptance Criteria

1. THE Trust_Engine SHALL implement the `checkBuyerEligibility(buyerId: string): Promise<EligibilityResult>` method signature.
2. THE Trust_Engine SHALL implement the `checkSellerEligibility(sellerId: string): Promise<EligibilityResult>` method signature.
3. THE Trust_Engine SHALL implement the `checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult>` method signature.
4. THE Trust_Engine SHALL return an `EligibilityResult` object with an `eligible: boolean` field and an optional `reason: string` field on all code paths.
5. WHEN the Trust_Engine is injected into PlaceOrderUseCase in place of the old CODEligibilityEngine, THE PlaceOrderUseCase SHALL function correctly without modification to its constructor or `execute` method.

---

### Requirement 9: Score Audit and Observability

**User Story:** As a platform operator, I want a complete, queryable audit trail of every score change, so that I can investigate disputes, tune signal weights, and demonstrate fairness to regulators.

#### Acceptance Criteria

1. THE Score_Repository SHALL store every Score_Event with: buyer ID, signal type, score delta, score before, score after, source service, source entity ID, and UTC timestamp.
2. WHEN an operator queries the score history for a buyer, THE Score_Repository SHALL return all Score_Events for that buyer in ascending chronological order.
3. THE Trust_Engine SHALL emit a domain event `CODScoreUpdated` after every successful score change, containing the buyer ID, new score, new Trust_Tier, and timestamp.
4. IF a score update fails to persist, THEN THE Trust_Engine SHALL not emit the `CODScoreUpdated` event and SHALL return an error to the caller.
5. FOR ALL buyers, replaying the Score_Event log SHALL reproduce the current COD_Eligibility_Score exactly (event-sourcing round-trip property).

---

### Requirement 10: Seller COD Eligibility

**User Story:** As a platform operator, I want seller COD eligibility to remain a simple verification check, so that the complexity of the trust scoring system is focused on buyer-side risk.

#### Acceptance Criteria

1. WHEN `checkSellerEligibility` is called, THE Trust_Engine SHALL verify that the seller's account is identity-verified.
2. IF the seller's account is not identity-verified, THEN THE Trust_Engine SHALL return an ineligible result with reason `SELLER_NOT_VERIFIED`.
3. WHERE a seller has explicitly disabled COD for their store, THE Trust_Engine SHALL return an ineligible result with reason `SELLER_COD_DISABLED`.
4. WHEN the seller is verified and has not disabled COD, THE Trust_Engine SHALL return an eligible result.
