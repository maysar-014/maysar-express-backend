# Requirements Document

## Introduction

The Enhanced COD Trust System extends the existing Progressive COD Trust System with ten targeted improvements identified through expert review of the live platform. The existing system provides a solid foundation — a score-based trust model with three tiers, event-sourced history, and a compatible eligibility interface — but has gaps that expose Maysar Express to fraud, gaming, and poor buyer experience in the Tanzania market.

The enhancements address: replacing the unlimited TRUSTED_BUYER tier with a capped 5-tier progression; requiring both behavioral score and demonstrated financial history for tier advancement; replacing city-based geographic restrictions with radius-based ones suited to Dar es Salaam's scale; tracking active exposure as a running sum rather than an order count; detecting linked accounts to prevent trust resets after fraud; requiring OTP confirmation before crediting delivery trust signals; adding per-order dynamic risk scoring; expanding courier signals into structured sub-types; surfacing COD eligibility on product listings without exposing internal scores; and adding seller-side COD risk signals.

All enhancements must preserve the existing `checkBuyerEligibility`, `checkSellerEligibility`, `checkOrderEligibility` interface so that `PlaceOrderUseCase` requires no structural changes. The event-sourced score history, existing signal types and weights, wallet commitment hold mechanism, and temporary restriction system must all be preserved.

---

## Glossary

- **COD**: Cash on Delivery — a payment method where the buyer pays the courier in cash upon receiving the order.
- **COD_Eligibility_Score**: An integer in the range 0–100 representing a buyer's accumulated trust level for COD transactions.
- **Trust_Engine**: The domain component responsible for computing and updating the COD_Eligibility_Score and evaluating COD eligibility.
- **Trust_Signal**: A measurable buyer or seller behaviour or attribute that positively or negatively influences the COD_Eligibility_Score.
- **Trust_Tier**: One of five named bands derived from the combination of COD_Eligibility_Score and Lifetime_COD_Value.
- **NEW_BUYER**: Trust_Tier for buyers who have not yet met the TRUSTED_BEGINNER thresholds.
- **TRUSTED_BEGINNER**: Trust_Tier for buyers with COD_Eligibility_Score ≥ 21 AND Lifetime_COD_Value ≥ TZS 100,000.
- **TRUSTED_BUYER**: Trust_Tier for buyers with COD_Eligibility_Score ≥ 41 AND Lifetime_COD_Value ≥ TZS 500,000.
- **GOLD_BUYER**: Trust_Tier for buyers with COD_Eligibility_Score ≥ 65 AND Lifetime_COD_Value ≥ TZS 2,000,000.
- **PLATINUM_BUYER**: Trust_Tier for buyers with COD_Eligibility_Score ≥ 85 AND Lifetime_COD_Value ≥ TZS 10,000,000.
- **Exposure_Limit**: The maximum total value (in TZS) of all Active_COD_Orders a buyer in a given Trust_Tier may hold simultaneously.
- **Active_Exposure**: The sum of the total amounts of all Active_COD_Orders for a given buyer.
- **Active_COD_Order**: A COD order that has been placed and not yet delivered, cancelled, or refunded.
- **Lifetime_COD_Value**: The cumulative total value (in TZS) of all COD orders a buyer has successfully completed (OTP-confirmed or dispute-window-cleared).
- **Dual_Axis_Threshold**: The pair of (minimum COD_Eligibility_Score, minimum Lifetime_COD_Value) that must both be satisfied for a buyer to advance to a given Trust_Tier.
- **Score_Repository**: The persistence component that stores and retrieves COD_Eligibility_Score records and Score_Events.
- **Score_Event**: An immutable record of a Trust_Signal event that contributed to a score change.
- **Courier_Report**: A structured record submitted by a courier after a delivery attempt, capturing outcome and buyer behaviour.
- **Delivery_OTP**: A one-time password sent to the buyer at delivery time, confirmation of which constitutes verified delivery.
- **Dispute_Window**: The 7-day period after a courier marks a delivery complete during which a buyer may raise a dispute; expiry without dispute constitutes confirmed delivery.
- **Identity_Graph**: The data structure linking buyer accounts that share one or more identity attributes (phone number, national ID, device fingerprint, or delivery address).
- **Linked_Account**: A buyer account connected to one or more other accounts via the Identity_Graph.
- **Per_Order_Risk_Score**: A dynamic risk assessment computed at order placement time based on contextual signals for that specific order.
- **Risk_Factor**: A contextual signal that contributes to the Per_Order_Risk_Score (e.g., new device, new address, high relative value, velocity, category risk).
- **Commitment_Fee**: A wallet hold equal to the delivery fee, applied to high-risk orders as additional friction.
- **PlaceOrderUseCase**: The existing application use-case that orchestrates order creation and COD validation.
- **Temporary_Restriction**: A time-bounded suspension of COD access applied to a buyer regardless of their Trust_Tier.
- **Dispute**: A formal complaint raised by a buyer or seller against an order.
- **COD_Dispute_Rate**: The ratio of COD orders resulting in a dispute to total COD orders, computed over a rolling 30-day window for a seller.

---

## Requirements

### Requirement 1: Five-Tier Exposure Limit Model

**User Story:** As a platform operator, I want COD exposure to be capped at every trust tier with no unlimited tier, so that the platform's maximum financial risk from any single buyer is always bounded.

#### Acceptance Criteria

1. THE Trust_Engine SHALL define exactly five Trust_Tiers: NEW_BUYER, TRUSTED_BEGINNER, TRUSTED_BUYER, GOLD_BUYER, and PLATINUM_BUYER.
2. WHILE a buyer is classified as NEW_BUYER, THE Trust_Engine SHALL enforce an Exposure_Limit of TZS 30,000.
3. WHILE a buyer is classified as TRUSTED_BEGINNER, THE Trust_Engine SHALL enforce an Exposure_Limit of TZS 150,000.
4. WHILE a buyer is classified as TRUSTED_BUYER, THE Trust_Engine SHALL enforce an Exposure_Limit of TZS 500,000.
5. WHILE a buyer is classified as GOLD_BUYER, THE Trust_Engine SHALL enforce an Exposure_Limit of TZS 2,000,000.
6. WHILE a buyer is classified as PLATINUM_BUYER, THE Trust_Engine SHALL enforce an Exposure_Limit of TZS 10,000,000.
7. WHEN a COD order is placed, THE Trust_Engine SHALL compute the buyer's Active_Exposure as the sum of all Active_COD_Order values for that buyer.
8. WHEN the sum of the buyer's Active_Exposure and the new order's total amount exceeds the buyer's Exposure_Limit, THE Trust_Engine SHALL return an ineligible result with reason `LIMIT_EXCEEDED`.
9. FOR ALL buyers and FOR ALL sequences of COD order placements and completions, THE Trust_Engine SHALL ensure the buyer's Active_Exposure never exceeds the Exposure_Limit of their current Trust_Tier (exposure limit invariant).

---

### Requirement 2: Dual-Axis Tier Progression

**User Story:** As a platform operator, I want tier advancement to require both a behavioral trust score and a demonstrated financial history, so that buyers cannot game the system by completing many small cheap orders to unlock high-value COD exposure.

#### Acceptance Criteria

1. THE Trust_Engine SHALL classify a buyer as TRUSTED_BEGINNER only when the buyer's COD_Eligibility_Score is ≥ 21 AND the buyer's Lifetime_COD_Value is ≥ TZS 100,000.
2. THE Trust_Engine SHALL classify a buyer as TRUSTED_BUYER only when the buyer's COD_Eligibility_Score is ≥ 41 AND the buyer's Lifetime_COD_Value is ≥ TZS 500,000.
3. THE Trust_Engine SHALL classify a buyer as GOLD_BUYER only when the buyer's COD_Eligibility_Score is ≥ 65 AND the buyer's Lifetime_COD_Value is ≥ TZS 2,000,000.
4. THE Trust_Engine SHALL classify a buyer as PLATINUM_BUYER only when the buyer's COD_Eligibility_Score is ≥ 85 AND the buyer's Lifetime_COD_Value is ≥ TZS 10,000,000.
5. WHEN a buyer's COD_Eligibility_Score meets a tier's score threshold but the buyer's Lifetime_COD_Value does not meet that tier's value threshold, THE Trust_Engine SHALL classify the buyer at the highest tier for which both thresholds are satisfied.
6. WHEN a buyer's Lifetime_COD_Value meets a tier's value threshold but the buyer's COD_Eligibility_Score does not meet that tier's score threshold, THE Trust_Engine SHALL classify the buyer at the highest tier for which both thresholds are satisfied.
7. THE Trust_Engine SHALL re-evaluate the Trust_Tier every time either the COD_Eligibility_Score or the Lifetime_COD_Value changes.
8. FOR ALL buyers and FOR ALL sequences of score changes and COD completions, THE Trust_Engine SHALL never advance a buyer's Trust_Tier unless both the score threshold and the Lifetime_COD_Value threshold for that tier are simultaneously satisfied (dual-axis invariant).

---

### Requirement 3: Radius-Based Geographic Restrictions

**User Story:** As a platform operator, I want COD geographic restrictions to be based on delivery radius rather than city boundaries, so that restrictions are meaningful in large cities like Dar es Salaam where city-level matching is too permissive.

#### Acceptance Criteria

1. WHEN a buyer classified as NEW_BUYER places their first-ever COD order, THE Trust_Engine SHALL restrict the delivery address to within 5 km of the seller's address.
2. WHEN a buyer classified as NEW_BUYER places a subsequent COD order (not their first), THE Trust_Engine SHALL restrict the delivery address to within 15 km of the seller's address.
3. WHILE a buyer is classified as TRUSTED_BEGINNER, THE Trust_Engine SHALL restrict COD deliveries to within the same city as the seller, with no radius cap within that city.
4. WHILE a buyer is classified as TRUSTED_BUYER, GOLD_BUYER, or PLATINUM_BUYER, THE Trust_Engine SHALL impose no geographic restriction on COD deliveries.
5. WHEN a COD order's delivery address falls outside the buyer's permitted geographic zone, THE Trust_Engine SHALL return an ineligible result with reason `AREA_RESTRICTION`.
6. THE Trust_Engine SHALL compute delivery distance using the geodesic distance between the seller's coordinates and the buyer's delivery coordinates.
7. FOR ALL Trust_Tier pairs where tier_A ranks higher than tier_B, THE Trust_Engine SHALL permit a geographic zone for tier_A that is equal to or larger than the geographic zone permitted for tier_B (radius monotonicity property).

---

### Requirement 4: Active Exposure Tracking

**User Story:** As a platform operator, I want the system to track the total outstanding COD value per buyer rather than a simple order count, so that a buyer cannot circumvent exposure limits by splitting a large purchase into multiple small orders.

#### Acceptance Criteria

1. THE Trust_Engine SHALL maintain an Active_Exposure value for each buyer, defined as the sum of the total amounts of all Active_COD_Orders for that buyer.
2. WHEN a COD order transitions to a terminal state (delivered, cancelled, or refunded), THE Trust_Engine SHALL subtract that order's total amount from the buyer's Active_Exposure.
3. WHEN a COD order is placed, THE Trust_Engine SHALL add that order's total amount to the buyer's Active_Exposure atomically with order creation.
4. WHEN the buyer's Active_Exposure plus the new order's total amount would exceed the buyer's Exposure_Limit, THE Trust_Engine SHALL reject the order with reason `LIMIT_EXCEEDED` before the order is persisted.
5. THE Trust_Engine SHALL apply the Exposure_Limit check to buyers at ALL Trust_Tiers, including PLATINUM_BUYER.
6. FOR ALL buyers, THE Trust_Engine SHALL ensure the Active_Exposure value equals the sum of total amounts of all non-terminal COD orders for that buyer at any point in time (active exposure consistency property).

---

### Requirement 5: Identity Graph and Linked Account Detection

**User Story:** As a platform operator, I want the system to detect when multiple accounts belong to the same person, so that a buyer who creates a new account after fraud cannot reset their trust score to zero.

#### Acceptance Criteria

1. THE Trust_Engine SHALL link two buyer accounts when they share any of the following identity attributes: phone number, national ID (from KYC verification), device fingerprint, or delivery address.
2. WHEN a new buyer account is created, THE Trust_Engine SHALL check all existing accounts for matching identity attributes and create Identity_Graph edges for any matches found.
3. WHEN a trust-negative event (DELIVERY_REFUSED, DISPUTE_LOST, POST_DISPATCH_CANCELLATION, or any COURIER signal) is recorded against any account in an Identity_Graph group, THE Trust_Engine SHALL propagate the worst trust signal to all Linked_Accounts in the group.
4. WHEN a new account is linked to an existing account that has a lower COD_Eligibility_Score, THE Trust_Engine SHALL initialise the new account's effective trust at the lower of the two scores.
5. WHEN a new account is linked to an existing account that has an active Temporary_Restriction, THE Trust_Engine SHALL apply the same Temporary_Restriction to the new account.
6. THE Trust_Engine SHALL record each Identity_Graph link as an immutable event containing the linked account IDs, the matching attribute type, and the UTC timestamp.
7. IF an identity attribute match is disputed by the buyer, THEN THE Trust_Engine SHALL flag the link for manual operator review without removing the link until an operator resolves it.
8. FOR ALL Identity_Graph groups, THE Trust_Engine SHALL ensure that linking accounts never results in any account in the group having a higher effective COD_Eligibility_Score than it had before linking (identity graph monotonicity property).

---

### Requirement 6: OTP-Confirmed Delivery Completion

**User Story:** As a platform operator, I want successful deliveries to be confirmed by the buyer via OTP before they count as positive trust signals, so that colluding sellers and buyers cannot farm trust signals through fake deliveries.

#### Acceptance Criteria

1. WHEN a courier marks a COD order as delivered, THE Trust_Engine SHALL NOT record a SUCCESSFUL_DELIVERY trust signal until delivery is confirmed.
2. WHEN a courier marks a COD order as delivered, THE Trust_Engine SHALL initiate a Delivery_OTP flow by sending a one-time password to the buyer's verified phone number.
3. WHEN the buyer submits the correct Delivery_OTP within 24 hours of the courier marking delivery, THE Trust_Engine SHALL record a SUCCESSFUL_DELIVERY trust signal and add the order's value to the buyer's Lifetime_COD_Value.
4. WHEN the Dispute_Window of 7 days expires after a courier marks delivery without the buyer raising a dispute, THE Trust_Engine SHALL record a SUCCESSFUL_DELIVERY trust signal and add the order's value to the buyer's Lifetime_COD_Value.
5. WHEN a buyer raises a dispute within the Dispute_Window, THE Trust_Engine SHALL NOT record a SUCCESSFUL_DELIVERY trust signal and SHALL suspend the Lifetime_COD_Value increment pending dispute resolution.
6. WHEN a buyer fails to submit the Delivery_OTP within 24 hours but does not raise a dispute, THE Trust_Engine SHALL wait for the full Dispute_Window to expire before recording the SUCCESSFUL_DELIVERY signal.
7. THE Trust_Engine SHALL record the confirmation method (OTP or dispute-window-expiry) as metadata on the SUCCESSFUL_DELIVERY Score_Event.
8. FOR ALL COD orders, THE Trust_Engine SHALL ensure a SUCCESSFUL_DELIVERY signal is recorded only after either OTP confirmation or Dispute_Window expiry without dispute (OTP confirmation invariant).

---

### Requirement 7: Dynamic Per-Order Risk Assessment

**User Story:** As a platform operator, I want each COD order to be assessed for contextual risk factors beyond the buyer's static tier, so that unusual orders from otherwise trusted buyers trigger additional friction rather than being silently approved.

#### Acceptance Criteria

1. WHEN `checkOrderEligibility` is called, THE Trust_Engine SHALL compute a Per_Order_Risk_Score by evaluating the following Risk_Factors: new device for this buyer, new delivery address never used before, order value more than 3× the buyer's average COD order value, order velocity exceeding 3 COD orders within 24 hours, and product category risk level.
2. WHEN the Per_Order_Risk_Score is LOW (zero Risk_Factors active), THE Trust_Engine SHALL return an eligible result with no additional friction.
3. WHEN the Per_Order_Risk_Score is MEDIUM (one or two Risk_Factors active), THE Trust_Engine SHALL return an eligible result with a `requiresCommitmentFee: true` flag.
4. WHEN the Per_Order_Risk_Score is HIGH (three or more Risk_Factors active), THE Trust_Engine SHALL return an eligible result with a `requiresCommitmentFee: true` flag and a `requiresManualReview: true` flag.
5. THE Trust_Engine SHALL apply the Per_Order_Risk_Score assessment to buyers at ALL Trust_Tiers, including PLATINUM_BUYER.
6. WHEN the Per_Order_Risk_Score assessment requires a Commitment_Fee, THE Trust_Engine SHALL set the Commitment_Fee amount equal to the order's delivery fee.
7. THE Trust_Engine SHALL record each Per_Order_Risk_Score computation as an immutable event containing the buyer ID, order ID, active Risk_Factors, resulting risk level, and UTC timestamp.
8. WHEN a buyer's device fingerprint changes from their previously recorded device, THE Trust_Engine SHALL treat this as the new-device Risk_Factor being active for that order.

---

### Requirement 8: Structured Courier Intelligence Signals

**User Story:** As a platform operator, I want courier reports to carry structured sub-types rather than a single generic negative signal, so that the system can distinguish between different fraud patterns and weight them appropriately.

#### Acceptance Criteria

1. THE Trust_Engine SHALL replace the single `COURIER_NEGATIVE_REPORT` signal type with four structured sub-types: `COURIER_UNREACHABLE_CUSTOMER`, `COURIER_SUSPICIOUS_ADDRESS`, `COURIER_REPEATED_REFUSAL`, and `COURIER_FAKE_PHONE`.
2. WHEN a courier submits a report indicating the buyer was unreachable by phone at delivery time, THE Trust_Engine SHALL record a Trust_Signal of type `COURIER_UNREACHABLE_CUSTOMER` with a score delta of −5.
3. WHEN a courier submits a report indicating the delivery address does not exist or is clearly fabricated, THE Trust_Engine SHALL record a Trust_Signal of type `COURIER_SUSPICIOUS_ADDRESS` with a score delta of −10.
4. WHEN a courier submits a report indicating a refusal by a buyer who has previously refused delivery from the same courier, THE Trust_Engine SHALL record a Trust_Signal of type `COURIER_REPEATED_REFUSAL` with a score delta of −20.
5. WHEN a courier submits a report indicating the phone number provided by the buyer was incorrect, THE Trust_Engine SHALL record a Trust_Signal of type `COURIER_FAKE_PHONE` with a score delta of −12.
6. THE Trust_Engine SHALL preserve backward compatibility by mapping any legacy `COURIER_NEGATIVE_REPORT` events in the Score_Event log to `COURIER_UNREACHABLE_CUSTOMER` when replaying history.
7. WHEN a Courier_Report is submitted, THE Trust_Engine SHALL require the courier to select exactly one sub-type from the four structured types.
8. THE Trust_Engine SHALL record the courier ID and order ID as metadata on all courier Trust_Signal Score_Events.

---

### Requirement 9: COD Eligibility Visibility on Product Listings

**User Story:** As a buyer, I want to see whether COD is available for a product before I add it to my cart, so that I am not surprised at checkout by a payment method I cannot use.

#### Acceptance Criteria

1. THE Trust_Engine SHALL expose a `getCODEligibilityForListing(buyerId: string, productId: string, price: number)` method that returns a COD availability indicator for a buyer-product-price combination.
2. WHEN the method is called, THE Trust_Engine SHALL return a `codAvailable: boolean` field indicating whether the buyer can currently use COD for this product at the given price.
3. WHEN COD is unavailable, THE Trust_Engine SHALL return a `codUnavailableReason` field containing exactly one of: `LIMIT_EXCEEDED`, `AREA_RESTRICTION`, `HIGH_RISK_ITEM`, or `ACCOUNT_RESTRICTION`.
4. THE Trust_Engine SHALL NOT include the buyer's COD_Eligibility_Score, Trust_Tier name, or Lifetime_COD_Value in the listing eligibility response.
5. WHEN COD is unavailable due to the buyer's exposure limit, THE Trust_Engine SHALL include an encouraging message such as "Complete more orders to unlock COD for higher-value items" in the response.
6. THE Trust_Engine SHALL treat the listing eligibility response as advisory only; the authoritative eligibility check SHALL remain `checkOrderEligibility` at checkout.
7. WHEN `checkOrderEligibility` returns a different result from the listing eligibility advisory for the same buyer-product-price combination, THE Trust_Engine SHALL honour the `checkOrderEligibility` result.
8. THE Trust_Engine SHALL complete the `getCODEligibilityForListing` call within 200ms under normal load conditions.
9. WHEN the buyer is not authenticated, THE Trust_Engine SHALL return `codAvailable: false` with reason `ACCOUNT_RESTRICTION`.

---

### Requirement 10: Seller-Side COD Risk Signals

**User Story:** As a platform operator, I want sellers to lose COD privileges when their behaviour creates COD dispute risk, so that the platform is protected from sellers who ship wrong or empty items and trigger buyer refusals.

#### Acceptance Criteria

1. THE Trust_Engine SHALL track a COD_Dispute_Rate for each seller, defined as the ratio of COD orders resulting in a dispute to total COD orders fulfilled by that seller over a rolling 30-day window.
2. WHEN a COD order dispute is resolved and the seller is found at fault due to shipping the wrong item, THE Trust_Engine SHALL record a seller Trust_Signal of type `SELLER_WRONG_ITEM_SHIPPED`.
3. WHEN a COD order dispute is resolved and the seller is found at fault due to shipping an empty package, THE Trust_Engine SHALL record a seller Trust_Signal of type `SELLER_EMPTY_PACKAGE`.
4. WHEN a seller's COD_Dispute_Rate exceeds 15% over the rolling 30-day window, THE Trust_Engine SHALL suspend that seller's COD privilege and return an ineligible result from `checkSellerEligibility` with reason `SELLER_HIGH_DISPUTE_RATE`.
5. WHEN a seller's COD privilege is suspended due to a high COD_Dispute_Rate, THE Trust_Engine SHALL notify the seller with the current dispute rate and the threshold required to reinstate COD access.
6. WHEN a seller's COD_Dispute_Rate drops below 10% over the rolling 30-day window after a suspension, THE Trust_Engine SHALL automatically reinstate the seller's COD privilege.
7. THE Trust_Engine SHALL record each seller COD privilege suspension and reinstatement as an immutable event containing the seller ID, reason, COD_Dispute_Rate at the time of the event, and UTC timestamp.
8. IF a seller has fewer than 5 COD orders in the rolling 30-day window, THEN THE Trust_Engine SHALL NOT apply the COD_Dispute_Rate threshold check, as the sample size is insufficient.

---

### Requirement 11: Preserved Interface Compatibility

**User Story:** As a backend engineer, I want the enhanced Trust_Engine to expose the same interface as the existing ProgressiveCODEligibilityEngine, so that PlaceOrderUseCase requires no structural changes.

#### Acceptance Criteria

1. THE Trust_Engine SHALL implement the `checkBuyerEligibility(buyerId: string): Promise<EligibilityResult>` method signature unchanged.
2. THE Trust_Engine SHALL implement the `checkSellerEligibility(sellerId: string): Promise<EligibilityResult>` method signature unchanged.
3. THE Trust_Engine SHALL implement the `checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult>` method signature unchanged.
4. THE Trust_Engine SHALL return an `EligibilityResult` object with an `eligible: boolean` field and an optional `reason: string` field on all code paths.
5. WHEN the enhanced Trust_Engine is injected into PlaceOrderUseCase in place of the existing ProgressiveCODEligibilityEngine, THE PlaceOrderUseCase SHALL function correctly without modification to its constructor or `execute` method.
6. THE Trust_Engine SHALL preserve all existing Trust_Signal types (SUCCESSFUL_DELIVERY, PHONE_VERIFIED, HIGH_VALUE_COMPLETION, ACCOUNT_AGE_MILESTONE, POST_DISPATCH_CANCELLATION, DELIVERY_REFUSED, DISPUTE_LOST) and their existing score deltas.
7. THE Trust_Engine SHALL preserve the existing Score_Event schema so that all historical Score_Events remain replayable.
8. THE Trust_Engine SHALL preserve the Temporary_Restriction mechanism, including the rule that a new restriction extends to the later end time when an active restriction already exists.

---

### Requirement 12: Score Bounds and Event-Sourcing Integrity

**User Story:** As a platform operator, I want the COD Eligibility Score to remain within valid bounds and be fully reproducible from the event log, so that I can audit, replay, and tune the system with confidence.

#### Acceptance Criteria

1. THE Trust_Engine SHALL constrain the COD_Eligibility_Score to the integer range [0, 100] at all times, clamping any delta that would push the score outside this range.
2. THE Score_Repository SHALL persist each score change as an immutable Score_Event containing: buyer ID, signal type, delta, score before, score after, source service, source entity ID, and UTC timestamp.
3. WHEN an operator replays the Score_Event log for a buyer, THE Trust_Engine SHALL reproduce the buyer's current COD_Eligibility_Score exactly (event-sourcing round-trip property).
4. THE Trust_Engine SHALL emit a domain event `CODScoreUpdated` after every successful score change, containing the buyer ID, new score, new Trust_Tier, and UTC timestamp.
5. IF a score update fails to persist, THEN THE Trust_Engine SHALL not emit the `CODScoreUpdated` event and SHALL return an error to the caller.
6. FOR ALL integers s in [0, 100], THE Trust_Engine SHALL assign exactly one Trust_Tier to s (tier completeness — no gaps, no overlaps).
7. FOR ALL valid sequences of Trust_Signal events applied to a buyer, THE Trust_Engine SHALL produce a COD_Eligibility_Score that equals the sum of all deltas clamped to [0, 100], ensuring score computation is deterministic and reproducible (score determinism property).

---

## Correctness Properties Summary

The following properties MUST be verified through property-based testing:

| # | Property | Type | Requirement |
|---|----------|------|-------------|
| P1 | Score bounds: COD_Eligibility_Score ∈ [0, 100] after any signal sequence | Invariant | Req 12.1 |
| P2 | Tier completeness: every integer in [0, 100] maps to exactly one Trust_Tier | Invariant | Req 12.6 |
| P3 | Exposure limit: Active_Exposure ≤ Exposure_Limit after any order sequence | Invariant | Req 1.9, 4.6 |
| P4 | Dual-axis invariant: tier only advances when both score AND Lifetime_COD_Value thresholds are met | Invariant | Req 2.8 |
| P5 | Identity graph monotonicity: linking accounts never increases any account's effective COD_Eligibility_Score | Metamorphic | Req 5.8 |
| P6 | OTP confirmation: SUCCESSFUL_DELIVERY signal fires only after OTP confirmation or Dispute_Window expiry | State machine | Req 6.8 |
| P7 | Radius monotonicity: geographic radius permitted never decreases as Trust_Tier increases | Metamorphic | Req 3.7 |
| P8 | Score determinism: replaying Score_Event log reproduces current score exactly | Round-trip | Req 12.3 |
