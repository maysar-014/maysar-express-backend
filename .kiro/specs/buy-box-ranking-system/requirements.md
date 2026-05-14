# Requirements Document

## Introduction

The Buy Box Ranking System replaces Maysar's current naive weighted-score model with a multi-signal, context-aware ranking engine that determines which seller's "Add to Cart" offer is shown by default when multiple sellers list the same product. The current model over-weights price (40%), creating a race to the bottom that drives out quality sellers and ignores critical trust signals such as dispute rates, cancellation rates, and courier performance.

The new system adopts a philosophy shift: **the Buy Box should optimise for long-term marketplace trust and successful commerce — not merely lowest price.** It introduces category-level weight strategies, recency-weighted rolling averages, fraud/manipulation detection, controlled seller rotation for fairness, geographic optimisation for Tanzania's delivery landscape, and a platform margin contribution signal. The system is designed to evolve toward ML-based contextual scoring.

This is built on top of the existing `BuyBox` and `Catalog_BuyBoxAlternative` schema models in the Maysar platform.

---

## Glossary

- **Buy_Box**: The default seller offer shown on a product page with the primary "Add to Cart" action; determined by the Ranking_Engine for each product.
- **Buy_Box_Winner**: The seller whose offer is currently assigned as the Buy_Box for a given product.
- **Ranking_Engine**: The domain component responsible for computing composite seller scores and selecting the Buy_Box_Winner.
- **Composite_Score**: A weighted sum of all scoring signals for a seller's offer on a specific product, normalised to the range [0, 100].
- **Scoring_Signal**: A measurable seller or offer attribute that contributes to the Composite_Score (e.g., price competitiveness, dispute rate, fulfillment reliability).
- **Signal_Weight**: The fractional contribution of a Scoring_Signal to the Composite_Score; all Signal_Weights for a given Category_Strategy MUST sum to 1.0.
- **Category_Strategy**: A named configuration of Signal_Weights tailored to a product category (e.g., groceries, electronics, fashion, medicines, furniture).
- **Default_Strategy**: The Category_Strategy applied when no category-specific strategy is configured; uses the platform-wide default weights.
- **Rolling_Window**: The time period over which historical performance metrics are computed; defaults to 90 days with exponential decay favouring recent events.
- **Seller_Trust_Score**: A composite sub-score (0–100) derived from verified identity, account age, dispute history, and platform compliance signals.
- **Fulfillment_Reliability_Score**: A sub-score (0–100) measuring the seller's historical rate of orders fulfilled without cancellation, return, or dispute.
- **Courier_Performance_Score**: A sub-score (0–100) measuring the delivery success rate of couriers associated with a seller's fulfilled orders.
- **Price_Competitiveness_Score**: A normalised score (0–100) representing how competitive a seller's price is relative to other offers for the same product; does not reward the absolute lowest price but rewards being within a competitive band.
- **Dispute_Rate**: The ratio of orders resulting in a formal dispute to total orders, computed over the Rolling_Window.
- **Cancellation_Rate**: The ratio of seller-initiated or seller-caused order cancellations to total orders, computed over the Rolling_Window.
- **Return_Rate**: The ratio of orders resulting in a return or refund to total orders, computed over the Rolling_Window.
- **Stock_Reliability_Score**: A sub-score (0–100) measuring the seller's historical rate of fulfilling orders without stock-out cancellations.
- **Customer_Retention_Impact**: A sub-score (0–100) measuring the rate at which buyers who purchased from a seller return to the platform within 60 days.
- **Margin_Contribution_Score**: A sub-score (0–100) reflecting the platform's estimated net margin from a seller's offer after commission, logistics cost, and COD failure risk.
- **Exploration_Slot**: A Buy_Box assignment given to a non-top-ranked seller as part of controlled rotation to provide visibility to new or improving sellers.
- **Exploration_Budget**: The maximum fraction of Buy_Box assignments (per product per time window) that may be allocated to Exploration_Slots; default 10%.
- **Geographic_Zone**: A named delivery area within Tanzania (e.g., Kariakoo, Mikocheni, Arusha CBD) used to contextualise delivery speed and courier reliability.
- **Anomaly_Flag**: A marker applied to a seller's signal data when the Fraud_Detector identifies statistically abnormal patterns suggesting manipulation.
- **Fraud_Detector**: The component responsible for identifying and flagging suspicious patterns in seller signals.
- **Score_Snapshot**: An immutable record of a seller's Composite_Score and all contributing signal values at a point in time, stored for audit and replay.
- **Operator**: A Maysar platform administrator with authority to configure Category_Strategies, adjust weights, and override Buy_Box assignments.
- **COD**: Cash on Delivery — the dominant payment method in Tanzania; failed COD deliveries are a significant cost signal.

---

## Requirements

### Requirement 1: Composite Score Computation

**User Story:** As a platform operator, I want each seller's offer to be scored using a weighted combination of trust and performance signals, so that the Buy Box rewards reliable, trustworthy sellers rather than only the cheapest price.

#### Acceptance Criteria

1. WHEN the Ranking_Engine computes a Composite_Score for a seller's offer, THE Ranking_Engine SHALL combine the following Scoring_Signals: `priceCompetitiveness`, `sellerTrustScore`, `fulfillmentReliability`, `deliverySpeed`, `stockReliability`, `disputeRate`, `cancellationRate`, `returnRate`, and `customerRetentionImpact`.
2. THE Ranking_Engine SHALL normalise each Scoring_Signal to the range [0, 100] before applying Signal_Weights.
3. THE Ranking_Engine SHALL compute the Composite_Score as the sum of each normalised signal value multiplied by its Signal_Weight.
4. THE Ranking_Engine SHALL constrain the resulting Composite_Score to the range [0, 100].
5. WHEN no Category_Strategy is configured for a product's category, THE Ranking_Engine SHALL apply the Default_Strategy with the following Signal_Weights: `priceCompetitiveness=0.22`, `sellerTrustScore=0.20`, `fulfillmentReliability=0.18`, `deliverySpeed=0.12`, `stockReliability=0.08`, `disputeRate=0.08`, `cancellationRate=0.05`, `returnRate=0.04`, `customerRetentionImpact=0.03`.
6. FOR ALL Category_Strategy configurations, THE Ranking_Engine SHALL reject any configuration where the sum of all Signal_Weights does not equal 1.0 (within a tolerance of ±0.001).
7. FOR ALL valid sets of normalised signal values and a valid Category_Strategy, THE Ranking_Engine SHALL produce a deterministic Composite_Score — the same inputs always yield the same output (determinism property).

---

### Requirement 2: Category-Level Ranking Strategies

**User Story:** As a platform operator, I want to configure different scoring weight profiles per product category, so that the Buy Box logic reflects the distinct trust priorities of each category (e.g., speed for groceries, authenticity for medicines, return rate for fashion).

#### Acceptance Criteria

1. THE Ranking_Engine SHALL support a named Category_Strategy for each product category, independently configurable from the Default_Strategy.
2. WHEN a product belongs to a category with a configured Category_Strategy, THE Ranking_Engine SHALL apply that strategy's Signal_Weights instead of the Default_Strategy.
3. THE Ranking_Engine SHALL support at minimum the following named strategies: `GROCERIES` (emphasises `deliverySpeed` and `stockReliability`), `ELECTRONICS` (emphasises `sellerTrustScore` and `fulfillmentReliability`), `FASHION` (emphasises `returnRate` and `customerRetentionImpact`), `MEDICINES` (emphasises `sellerTrustScore` with a minimum Seller_Trust_Score threshold of 70), and `FURNITURE` (emphasises `fulfillmentReliability` and `deliverySpeed`).
4. WHEN an Operator updates a Category_Strategy's Signal_Weights, THE Ranking_Engine SHALL validate that the new weights sum to 1.0 (±0.001) before persisting the change.
5. IF a Category_Strategy update fails validation, THEN THE Ranking_Engine SHALL reject the update and return a descriptive error identifying which weights are invalid.
6. WHEN a Category_Strategy is updated, THE Ranking_Engine SHALL recompute Buy_Box assignments for all affected products within 60 minutes.
7. FOR ALL products in a category, THE Ranking_Engine SHALL apply the same Category_Strategy consistently — no product in the same category SHALL use a different strategy unless explicitly overridden by an Operator.

---

### Requirement 3: Recency-Weighted Rolling Averages

**User Story:** As a platform operator, I want seller performance metrics to emphasise recent behaviour over historical data, so that improving sellers are rewarded and declining sellers are penalised promptly.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL compute all rate-based Scoring_Signals (`disputeRate`, `cancellationRate`, `returnRate`, `fulfillmentReliability`, `stockReliability`) using a Rolling_Window of 90 days by default.
2. THE Ranking_Engine SHALL apply exponential decay weighting within the Rolling_Window, assigning higher weight to events in the most recent 30 days than to events in the 31–90 day range.
3. WHEN a seller has fewer than 10 orders within the Rolling_Window, THE Ranking_Engine SHALL apply a Bayesian prior blending the seller's observed rate with the platform-wide category average, weighted by order count.
4. WHEN a seller has zero orders within the Rolling_Window, THE Ranking_Engine SHALL use the platform-wide category average for all rate-based signals and apply a `NEW_SELLER` confidence penalty of 10 points to the Composite_Score.
5. THE Ranking_Engine SHALL recompute rolling averages at least once every 24 hours for all active sellers.
6. FOR ALL sellers with at least 10 orders in the Rolling_Window, THE Ranking_Engine SHALL produce a Composite_Score that reflects the exponentially decayed signal values — a seller with identical raw rates but more recent positive events SHALL receive a higher score than one with older positive events (recency ordering property).

---

### Requirement 4: Price Competitiveness Scoring

**User Story:** As a platform operator, I want price to be a meaningful but not dominant signal, so that the Buy Box rewards competitive pricing without triggering a race to the bottom that drives out quality sellers.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL compute the Price_Competitiveness_Score by comparing a seller's offer price to the median price of all active offers for the same product.
2. WHEN a seller's price is within 5% above or below the median offer price, THE Ranking_Engine SHALL assign a Price_Competitiveness_Score of 100.
3. WHEN a seller's price is more than 5% below the median offer price, THE Ranking_Engine SHALL apply a diminishing-returns curve that caps the Price_Competitiveness_Score at 85, preventing extreme undercutting from dominating the score.
4. WHEN a seller's price is more than 20% above the median offer price, THE Ranking_Engine SHALL assign a Price_Competitiveness_Score of 0.
5. WHEN a seller's price is between 5% and 20% above the median offer price, THE Ranking_Engine SHALL assign a Price_Competitiveness_Score that decreases linearly from 100 to 0 over that range.
6. IF only one seller offers a product, THE Ranking_Engine SHALL assign that seller a Price_Competitiveness_Score of 100 regardless of absolute price.
7. FOR ALL sets of offer prices for the same product, THE Ranking_Engine SHALL produce Price_Competitiveness_Scores such that no seller with a price more than 20% above median scores higher than a seller priced within the competitive band (price ordering invariant).

---

### Requirement 5: Fraud and Manipulation Detection

**User Story:** As a platform operator, I want the ranking system to detect and neutralise manipulation attempts, so that sellers cannot game the Buy Box through fake ratings, artificial stock levels, or abnormal pricing patterns.

#### Acceptance Criteria

1. THE Fraud_Detector SHALL monitor each seller's Scoring_Signal values for statistically abnormal changes, defined as a change of more than 2 standard deviations from the seller's own 90-day rolling mean within a 7-day window.
2. WHEN the Fraud_Detector identifies an Anomaly_Flag on a seller's signal, THE Ranking_Engine SHALL exclude the flagged signal from the Composite_Score computation and substitute the seller's 90-day rolling average for that signal.
3. WHEN a seller accumulates 3 or more Anomaly_Flags within a 30-day period, THE Ranking_Engine SHALL apply a `MANIPULATION_PENALTY` of 20 points subtracted from the Composite_Score.
4. THE Fraud_Detector SHALL flag a seller's stock level signal when reported available stock increases by more than 500% within 24 hours without a corresponding supplier shipment record.
5. THE Fraud_Detector SHALL flag a seller's price signal when the offer price drops more than 40% below the seller's own 30-day average price without a corresponding promotional campaign record.
6. WHEN an Anomaly_Flag is applied, THE Ranking_Engine SHALL record the flag in the Score_Snapshot with the signal name, detected value, expected range, and UTC timestamp.
7. IF an Operator reviews and clears an Anomaly_Flag, THEN THE Ranking_Engine SHALL restore the original signal value in the next Composite_Score computation and remove the `MANIPULATION_PENALTY` if the flag count drops below 3.

---

### Requirement 6: Controlled Seller Rotation and Exploration

**User Story:** As a platform operator, I want new and improving sellers to receive periodic Buy Box exposure, so that the marketplace avoids winner-takes-all monopolisation and gives quality newcomers a path to visibility.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL reserve up to the Exploration_Budget (default 10%) of Buy_Box_Winner assignments per product per 7-day window for Exploration_Slots.
2. WHEN an Exploration_Slot is allocated, THE Ranking_Engine SHALL select the seller with the highest Composite_Score among sellers who have not held the Buy_Box for that product in the preceding 7 days and whose Composite_Score is within 15 points of the top-ranked seller.
3. WHEN no eligible seller exists for an Exploration_Slot (all qualifying sellers have held the Buy_Box recently or no seller is within 15 points), THE Ranking_Engine SHALL assign the Buy_Box to the top-ranked seller.
4. THE Ranking_Engine SHALL not assign an Exploration_Slot to a seller with an active `MANIPULATION_PENALTY` or an Anomaly_Flag.
5. WHEN a seller is assigned an Exploration_Slot, THE Ranking_Engine SHALL record the assignment as `EXPLORATION` type in the Score_Snapshot to distinguish it from merit-based assignments.
6. THE Ranking_Engine SHALL ensure that the top-ranked seller by Composite_Score holds the Buy_Box for at least 90% of assignments per product per 7-day window (fairness floor).
7. FOR ALL products with at least 2 eligible sellers, THE Ranking_Engine SHALL produce a Buy_Box assignment history where no single seller holds 100% of assignments over any 30-day window (monopolisation prevention property).

---

### Requirement 7: Geographic Optimisation

**User Story:** As a buyer in Tanzania, I want the Buy Box to consider my delivery location, so that I see the seller most likely to deliver reliably and quickly to my specific area.

#### Acceptance Criteria

1. WHEN a buyer's delivery address is known, THE Ranking_Engine SHALL apply a geographic context adjustment to the `deliverySpeed` and `fulfillmentReliability` signals based on the seller's historical performance within the buyer's Geographic_Zone.
2. WHEN a seller has fewer than 5 fulfilled orders in the buyer's Geographic_Zone, THE Ranking_Engine SHALL use the seller's platform-wide `deliverySpeed` and `fulfillmentReliability` scores as the geographic fallback.
3. THE Ranking_Engine SHALL maintain separate Courier_Performance_Score values per Geographic_Zone, reflecting the delivery success rates of couriers operating in each zone.
4. WHEN computing the Buy_Box for a buyer in a specific Geographic_Zone, THE Ranking_Engine SHALL weight the Courier_Performance_Score of couriers available in that zone into the `fulfillmentReliability` signal.
5. WHEN a buyer's delivery address is not provided (e.g., browsing without a saved address), THE Ranking_Engine SHALL compute the Buy_Box using platform-wide averages without geographic adjustment.
6. THE Ranking_Engine SHALL support at minimum the following Geographic_Zones for Tanzania: `DAR_ES_SALAAM_KARIAKOO`, `DAR_ES_SALAAM_MIKOCHENI`, `DAR_ES_SALAAM_OTHER`, `ARUSHA`, `MWANZA`, `DODOMA`, and `OTHER_TANZANIA`.
7. FOR ALL buyers with the same delivery Geographic_Zone and the same set of seller offers, THE Ranking_Engine SHALL produce the same Buy_Box result (geographic determinism property).

---

### Requirement 8: COD Failure Risk Signal

**User Story:** As a platform operator, I want the Buy Box to account for COD delivery failure risk, so that sellers with high COD refusal rates are penalised given the significant cost of failed COD deliveries in Tanzania.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL incorporate a COD failure risk sub-score into the `fulfillmentReliability` signal for products where COD is the buyer's selected payment method.
2. THE Ranking_Engine SHALL compute the COD failure risk sub-score from the seller's historical rate of COD orders where the buyer refused delivery or was unreachable, computed over the Rolling_Window.
3. WHEN a seller's COD refusal rate exceeds 15% over the Rolling_Window, THE Ranking_Engine SHALL apply a `HIGH_COD_RISK` penalty of 10 points subtracted from the Composite_Score.
4. WHEN a seller's COD refusal rate exceeds 30% over the Rolling_Window, THE Ranking_Engine SHALL apply a `CRITICAL_COD_RISK` penalty of 25 points subtracted from the Composite_Score.
5. WHEN the buyer's payment method is not COD, THE Ranking_Engine SHALL not apply COD failure risk penalties to any seller's Composite_Score.
6. FOR ALL sellers with a COD refusal rate above 30%, THE Ranking_Engine SHALL produce a Composite_Score lower than an otherwise identical seller with a COD refusal rate below 15% (COD risk ordering invariant).

---

### Requirement 9: Platform Margin Contribution

**User Story:** As a platform operator, I want the Buy Box to consider the platform's estimated net margin from each seller's offer, so that the marketplace does not systematically favour offers that erode profitability.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL compute the Margin_Contribution_Score for each seller's offer using the estimated net margin after deducting the seller's commission tier, estimated logistics cost for the delivery zone, and expected COD failure cost.
2. WHEN a seller's estimated net margin for an offer is negative (the platform loses money on the transaction), THE Ranking_Engine SHALL apply a `NEGATIVE_MARGIN` penalty of 15 points subtracted from the Composite_Score.
3. WHEN a seller's estimated net margin is in the top quartile of all offers for the same product, THE Ranking_Engine SHALL add a `HIGH_MARGIN` bonus of 5 points to the Composite_Score.
4. THE Ranking_Engine SHALL cap the total margin-related adjustment (penalty + bonus) at ±15 points to prevent margin signals from overriding trust and performance signals.
5. WHEN margin data is unavailable for a seller's offer, THE Ranking_Engine SHALL treat the Margin_Contribution_Score as neutral (no penalty, no bonus) and log the missing data.
6. THE Ranking_Engine SHALL recompute Margin_Contribution_Scores whenever commission tiers, logistics cost tables, or COD failure rate estimates are updated.

---

### Requirement 10: Buy Box Assignment and Persistence

**User Story:** As a platform operator, I want Buy Box assignments to be computed, persisted, and served efficiently, so that product pages always display the correct Buy Box winner without real-time computation on every page load.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL compute and persist a Buy_Box_Winner for every product that has at least one active seller offer with in-stock inventory.
2. WHEN a seller's Composite_Score changes by more than 5 points, THE Ranking_Engine SHALL trigger a Buy_Box recomputation for all products that seller offers.
3. THE Ranking_Engine SHALL recompute all Buy_Box assignments on a scheduled basis at least once every 6 hours.
4. WHEN a Buy_Box_Winner is assigned, THE Ranking_Engine SHALL persist the winner's `sellerId`, `Composite_Score`, `lastComputedAt` timestamp, and the ranked list of alternative sellers with their scores in the existing `catalog_buy_boxes` and `catalog_buy_box_alternatives` tables.
5. WHEN a product has no active seller offers with in-stock inventory, THE Ranking_Engine SHALL clear the Buy_Box assignment and mark the product as having no active Buy_Box.
6. THE Ranking_Engine SHALL complete a full Buy_Box recomputation for a single product within 500ms under normal load conditions.
7. THE Ranking_Engine SHALL persist a Score_Snapshot for every Buy_Box computation, capturing all signal values, weights, Composite_Score, assignment type (`MERIT` or `EXPLORATION`), and UTC timestamp for audit purposes.

---

### Requirement 11: Score Audit and Observability

**User Story:** As a platform operator, I want a complete audit trail of every Buy Box decision and score computation, so that I can investigate seller disputes, tune signal weights, and demonstrate fairness.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL store every Score_Snapshot with: product ID, seller ID, all individual signal values, all Signal_Weights applied, Composite_Score, assignment type, Category_Strategy name, geographic context (if applicable), and UTC timestamp.
2. WHEN an Operator queries the Buy_Box history for a product, THE Ranking_Engine SHALL return all Score_Snapshots for that product in descending chronological order.
3. THE Ranking_Engine SHALL emit a domain event `BuyBoxAssigned` after every Buy_Box_Winner change, containing the product ID, new winner seller ID, previous winner seller ID, new Composite_Score, and timestamp.
4. IF a Buy_Box computation fails for any reason, THEN THE Ranking_Engine SHALL retain the previous Buy_Box_Winner assignment, log the failure with full context, and emit a `BuyBoxComputationFailed` event.
5. FOR ALL products, replaying the Score_Snapshot log with the same signal values and weights SHALL reproduce the same Buy_Box_Winner assignment (audit replay property).

---

### Requirement 12: Seller Eligibility and Disqualification

**User Story:** As a platform operator, I want certain seller conditions to disqualify a seller from winning the Buy Box entirely, so that buyers are never directed to suspended, unverified, or critically underperforming sellers.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL disqualify a seller from Buy_Box consideration when the seller's account status is suspended, banned, or pending verification.
2. THE Ranking_Engine SHALL disqualify a seller from Buy_Box consideration when the seller's reported stock level for the product variant is zero or below the minimum fulfillable quantity.
3. WHEN a seller's Dispute_Rate exceeds 25% over the Rolling_Window, THE Ranking_Engine SHALL disqualify the seller from Buy_Box consideration for all products in the affected category until the rate drops below 20%.
4. WHEN a seller's Cancellation_Rate exceeds 20% over the Rolling_Window, THE Ranking_Engine SHALL disqualify the seller from Buy_Box consideration until the rate drops below 15%.
5. WHEN a product belongs to the `MEDICINES` category, THE Ranking_Engine SHALL disqualify any seller whose Seller_Trust_Score is below 70.
6. IF all sellers for a product are disqualified, THEN THE Ranking_Engine SHALL clear the Buy_Box assignment and mark the product as having no active Buy_Box.
7. WHEN a seller is disqualified, THE Ranking_Engine SHALL record the disqualification reason and timestamp in the Score_Snapshot.

---

### Requirement 13: Operator Configuration and Overrides

**User Story:** As a platform operator, I want to configure ranking strategies and manually override Buy Box assignments when necessary, so that I can respond to business needs, promotions, and edge cases.

#### Acceptance Criteria

1. THE Ranking_Engine SHALL provide an operator interface for creating, updating, and deleting Category_Strategies with full weight validation.
2. WHEN an Operator applies a manual Buy_Box override for a product, THE Ranking_Engine SHALL assign the specified seller as Buy_Box_Winner and record the override with the operator ID, reason, start time, and optional end time.
3. WHILE a manual override is active, THE Ranking_Engine SHALL not replace the overridden Buy_Box_Winner through automated recomputation.
4. WHEN a manual override's end time has passed, THE Ranking_Engine SHALL automatically resume normal Composite_Score-based Buy_Box assignment.
5. THE Ranking_Engine SHALL allow Operators to adjust the Exploration_Budget between 0% and 20% per category.
6. IF an Operator sets the Exploration_Budget to 0%, THEN THE Ranking_Engine SHALL disable Exploration_Slots entirely for that category and always assign the top-ranked seller.
7. THE Ranking_Engine SHALL maintain a full audit log of all operator configuration changes, including the operator ID, changed field, previous value, new value, and UTC timestamp.

---

### Requirement 14: Property-Based Correctness Properties

**User Story:** As a developer, I want the ranking system to satisfy formal correctness properties, so that edge cases and invariants are continuously verified.

#### Acceptance Criteria

1. FOR ALL valid sets of normalised signal values and a valid Category_Strategy, THE Ranking_Engine SHALL produce a Composite_Score in [0, 100] (score bounds invariant).
2. FOR ALL valid Category_Strategy configurations, THE Ranking_Engine SHALL reject any configuration where Signal_Weights do not sum to 1.0 ±0.001 (weight sum invariant).
3. FOR ALL pairs of sellers A and B where seller A has strictly higher values on every Scoring_Signal than seller B, THE Ranking_Engine SHALL assign seller A a higher Composite_Score than seller B under the same Category_Strategy (monotonicity property).
4. FOR ALL products with at least 2 eligible sellers over a 30-day window, THE Ranking_Engine SHALL produce a Buy_Box assignment history where no single seller holds 100% of assignments (rotation property).
5. FOR ALL Composite_Score computations, applying the same signal values and weights twice SHALL produce the same score (idempotence property).
6. FOR ALL Score_Snapshots, recomputing the Composite_Score from the stored signal values and weights SHALL reproduce the stored Composite_Score within ±0.01 (audit round-trip property).
