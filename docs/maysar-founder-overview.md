# Maysar — A Founder's Statement

*Abdallah Razaki Hamisi, Founder*

---

## What we are building and why

Tanzania's digital economy is growing — but growth alone does not distribute value equitably. Across the country, buyers struggle not with finding a product but with knowing who to trust, what protections they have, and whether their money is safe. Sellers lack the infrastructure to compete on merit rather than on connection. Couriers and delivery partners operate without visibility into whether their effort is being fairly measured or compensated. And as a result, the enormous economic energy of Tanzanian communities — the sellers in Kariakoo, the entrepreneurs in Mwanza, the household buyers in Dodoma — remains undercoordinated, underprotected, and underserved.

Maysar exists to change that.

We are building a multi-sided commerce and logistics platform anchored to the Tanzanian context: mobile-first access, Cash on Delivery as a dominant and legitimate payment mode, a market composed primarily of independent sellers and small businesses, and communities where trust has to be earned through consistent behavior rather than assumed by brand recognition.

The platform brings buyers, sellers, couriers, service partners, field enablers, and suppliers into a shared operating environment. Not a directory. Not a listing service. A system with real behavioral guarantees — for payments, for delivery, for commerce communication, for dispute resolution, and for the fair treatment of every participant.

---

## The infrastructure problem no one talks about

When people discuss the challenges of e-commerce in emerging markets, they typically focus on connectivity or logistics costs. Both matter. But the more fundamental problem is the absence of reliable institutional infrastructure for commercial trust.

In a developed market, a buyer placing an order online is protected by layers of consumer law, payment dispute mechanisms, credit card chargebacks, and enforcement bodies that have existed for decades. A seller trusts that payment will clear. A courier trusts that job compensation is calculated honestly. A field agent trusts that their contribution to a sale is attributed and paid.

In Tanzania, many of these institutional guarantees are either absent or inaccessible to most participants. The trust infrastructure that enables commerce has to be built at the platform level — not assumed from the environment.

This is the problem Maysar is solving. Not by exporting a Western model onto a Tanzanian context, but by designing infrastructure that fits the actual conditions: high COD usage, informal trust networks, mobile money dominance, variable address precision, voice-first communication preferences, and a marketplace composed of thousands of small and independent operators.

---

## How the system is designed to earn and maintain trust

### Buyer trust: behavioral, not credential-based

The central design challenge for a COD-heavy market is this: how do you allow a buyer to pay at the door without creating unacceptable refusal risk for the seller and courier?

Our answer is a dual-axis behavioral trust model. Every buyer accumulates a score (0–100) based on their delivery history — successful deliveries increase it, refused deliveries and post-dispatch cancellations reduce it. The signals are specific and weighted: a successful delivery adds 8 points, a refused delivery removes 15, a courier report of repeated refusal removes 20, a high-value completion adds 10. Independently, we track the buyer's cumulative confirmed COD transaction value in Tanzanian shillings. Both axes must meet thresholds for a buyer to advance through the trust tiers.

The system has five tiers — from NEW_BUYER through TRUSTED_BEGINNER, TRUSTED_BUYER, GOLD_BUYER, to PLATINUM_BUYER — and each tier governs not just how much a buyer can transact on COD, but how far from the seller they can request delivery, how many concurrent COD orders they can hold, and what additional friction the system adds to their orders. A NEW_BUYER is limited to a 24-kilometer delivery radius and TZS 30,000 in simultaneous COD exposure with a maximum of one concurrent order. A PLATINUM_BUYER requires both a behavioral score of 85 or higher and TZS 10,000,000 in confirmed lifetime COD value — and can transact up to that amount nationwide without geographic restriction and with no concurrent order limit.

This progression is earned through demonstrated behavior. It cannot be purchased or transferred. The score is event-sourced — every change is appended to `order_cod_score_events` and the current score is a materialized view. The full history is permanently replayable.

Beyond individual scores, the system maintains an identity graph. Accounts sharing a phone number, national ID, device fingerprint, or delivery address are linked. Negative signals propagate across the graph. A bad actor cannot reset their history by creating a new account.

Per-order risk assessment adds a further layer. Before any COD order is placed, the system assesses five dynamic risk factors: new device, new delivery address, high value relative to buyer's history, high order velocity, and high-risk product category. Zero factors produces a clean approval. One or two factors triggers a commitment fee requirement. Three or more factors triggers both a commitment fee and a manual review flag. This means two buyers at the same trust tier can face different friction depending on the specifics of their current order.

### Seller trust: compliance with accountability

Every seller on Maysar passes KYC verification that includes AML screening against sanctions and politically exposed persons lists, TRA tax compliance verification, and TCRA registration check where applicable. The verification path is: automated document pre-checks, manual compliance officer review, AML screening, TRA check, TCRA check, final decision. Rejection provides a reason and an appeal path. Approval requires passing all stages. Annual re-verification is required to maintain active status.

Ongoing trust is maintained through behavioral signals: rolling COD dispute rates, fulfillment reliability, cancellation rates, return rates, and stock behavior. A seller whose rolling 30-day COD dispute rate exceeds 15% across a minimum of five orders is automatically suspended from offering COD until the rate drops below 10%.

These signals feed directly into the buy-box ranking engine — the algorithm that determines which seller is featured when multiple sellers offer the same product. The ranking is a nine-signal composite score: price competitiveness (22%), seller trust score (20%), fulfillment reliability (18%), delivery speed (12%), stock reliability (8%), dispute rate (8%), cancellation rate (5%), return rate (4%), and customer retention impact (3%). Weights are category-specific: medicines weight seller trust at 35% and price at only 10%, with a hard disqualification threshold — any medicine seller scoring below 70 on trust cannot appear in the buy box regardless of price; groceries weight delivery speed at 25% and stock reliability at 18%.

The fraud detection layer inside the ranking engine runs three passes before any score is finalized. The first pass is statistical: any signal more than two standard deviations from the rolling mean is flagged as anomalous and replaced with the rolling average rather than accepted at face value. The second pass targets stock manipulation: a stock level increase of more than 500% without a corresponding supplier shipment record is flagged. The third pass targets predatory pricing: a price drop of more than 40% below the 30-day average without an active promotional campaign is flagged. Accumulating three or more active flags triggers a 20-point score penalty. Scores are recomputed every six hours.

Critically, the pricing signal is designed to prevent a race to the bottom. A seller who prices 50% below the market median does not outscore a seller who prices within 5% of the median — the sub-median score caps at 85 using a logarithmic curve that eliminates reward for extreme undercutting. A seller priced more than 20% above the median receives a zero price score. The system rewards sustainable pricing, not predatory competition.

### Delivery trust: OTP verification, GPS proof, and full carrier accountability

Delivery is not treated as an invisible handoff. Every COD delivery requires OTP confirmation — the courier generates an OTP that is sent to the buyer via SMS, and delivery is only confirmed when the buyer provides that OTP at the door alongside the cash. The confirmation is timestamped, location-verified against the delivery coordinates, and permanently audited. If the OTP is missing or location proof is absent, the delivery cannot be closed.

The system calculates delivery prices through a three-engine pipeline — permanently separating logistics cost (what it actually costs to perform the delivery, including base operating cost, distance at the vehicle tariff rate, time, loading fees, waiting time beyond the free window), buyer price (logistics cost plus Maysar margin minus applicable discounts), and driver compensation (base compensation plus distance, time, weight/volume load factor, stop compensation, and approved extras) as distinct concepts that are computed independently and never collapsed into a single field. Every delivery generates an immutable ledger record carrying all four values — logistics cost, buyer price, driver compensation, and Maysar margin — along with the pricing version, tariff version, and routing configuration active at transaction time. Any historical delivery can be reproduced exactly from these records six months later.

Driver compensation is subject to a hard floor enforced before any job can be dispatched: no delivery job is offered to a driver whose estimated compensation falls below the minimum earnings threshold for their vehicle class. The system will not dispatch a job that pays less than the floor, regardless of operational pressure. The DriverCompensationEngine reports `meetsMinimumEarnings` and `minimumShortfallTzs` — a job that fails the gate is held for repricing, consolidation with another job, or escalation to operations.

---

## How logistics is built for Tanzania's geography and scale

The logistics engine is one of the most technically intensive parts of the platform, because delivery in Tanzania is genuinely different from delivery in markets where Western logistics software was designed.

Route optimization, zone classification, and geographic eligibility checks use a local database of 3,054 Tanzanian wards with their precise coordinates. Ward centroids are stored on buyer delivery addresses and seller locations. Distance calculations, delivery radius enforcement for COD trust tiers, and logistics zone determination all operate against this local dataset — none of these flows depend on external routing APIs. If a ward code is missing, the check falls back to region-level matching.

Every order that clears checkout creates a Shipment record: the atomic unit of physical movement, carrying origin and destination coordinates, package weight, cargo dimensions, handling requirements (fragile, temperature-controlled, hazmat), requested delivery window, and the required vehicle class. Shipments flow through a defined state machine — CREATED → PLANNED → ASSIGNED → DISPATCHED → DELIVERED → CONFIRMED → SETTLED — with failure sub-reasons (FAILED_PICKUP, CUSTOMER_UNAVAILABLE, SUPPLIER_DELAY, DRIVER_FAILURE, DAMAGED, DISPUTED) that are enforced at transition time. No arbitrary status writes are permitted; transitions happen through named methods only.

Delivery Jobs are the unit assigned to a driver. A single job may carry multiple consolidated Shipments. Jobs have their own state machine — PENDING → ASSIGNED → DRIVER_ACCEPTED → AT_PICKUP → LOADING → IN_TRANSIT → AT_DESTINATION → DELIVERED → CONFIRMED → SETTLED — with named transition methods enforced at the entity level. Every state transition emits a typed event to the outbox: DriverAssigned, GoodsLoaded, ShipmentDeparted, DeliveryAttempted, DeliveryCompleted, DeliveryFailed. These events propagate to the order service, payment service, and trust service, each of which reacts independently without the logistics service needing to know about their behavior.

For consolidation, the system scans pending Shipments in overlapping geographic clusters — within the configured consolidation radius — and creates shared Delivery Jobs when multiple orders can be served by the same vehicle on the same route. A pool optimization job runs every five minutes, clusters pending shipments, generates candidate jobs, and presents them to available drivers through the matching engine. Consolidation savings are attributed to Maysar as an efficiency gain — buyer prices are locked at checkout confirmation and never changed after the fact, even if post-confirmation route optimization produces a lower actual cost.

The system supports four vehicle classes — MOTORCYCLE, PICKUP, VAN, TRUCK — with distinct tariff schedules covering base operating cost per job, cost per kilometre, cost per hour, loading fee, unloading fee, waiting rate per minute beyond the free window, and minimum job compensation. Tariffs are append-only and versioned monotonically; historical orders always reference the exact tariff version active at the time of pricing and that record is never overwritten. Vehicle assignment takes into account cargo dimensions, weight capacity, refrigeration requirements, fragility, and hazmat classification. Incompatible vehicle requirements cannot be consolidated into the same Delivery Job — a MOTORCYCLE and a VAN requirement in the same candidate group always produce two separate jobs.

The driver matching engine scores available drivers against a Delivery Job using a composite of: vehicle compatibility (hard filter first), distance to pickup, available weight and volume capacity, historical reliability score over the last 90 days, current route compatibility, estimated arrival time at pickup, and compensation cost against the minimum earnings floor. Assignment is never made on cheapest alone. Every matching evaluation — whether the driver was selected or excluded — is persisted to the audit table so that any assignment decision can be explained after the fact.

When deliveries deviate from plan, every cost adjustment is attributed to a responsible party. Supplier not ready at pickup window → attributed to SUPPLIER. Customer unreachable at delivery → attributed to CUSTOMER. Route incorrectly calculated → attributed to MAYSAR. Driver deviation from route → attributed to DRIVER. External conditions (traffic, weather) → attributed to EXTERNAL. Attribution determines settlement — customer-caused costs can be recovered under explicit policy; Maysar-caused costs are absorbed by the platform; supplier-caused costs are deducted from supplier settlement. None of this is opaque or discretionary, and none of it can be altered after the fact because cost adjustments are immutable records.

The fairness engine validates every generated fulfillment option before it can be offered to a buyer. Four checks run in sequence: buyer fairness (the buyer's price does not exceed the configured maximum ratio over the actual fulfillment cost), driver fairness (the driver's estimated compensation per active hour meets the minimum hourly rate threshold), supplier fairness (no cost attributed to the supplier is being passed to the buyer), and Maysar sustainability (Maysar's margin on the transaction is non-negative). Options that fail any check are not silently removed. An internal FairnessFlag record is created, surfaced to the operations team, and the option appears in the `fairnessExcluded` response field with the full violation detail. The system cannot make a bad option invisible; it can only escalate it.

---

## What a buyer actually sees when they choose delivery

Maysar does not show buyers a single delivery price. The fulfillment option engine generates multiple distinct options for every order — each one a complete, independently priced plan — and ranks them before presenting them.

The four option types are: Supplier Delivery (the seller uses their own carrier; Maysar passes through with minimal margin), Maysar Shared (Maysar consolidates this shipment with nearby orders in the same delivery window, producing a lower price in exchange for a less precise time commitment), Maysar Express (a dedicated Maysar route for buyers who need a defined delivery window), and Customer Pickup (zero delivery cost for orders from sellers who support local collection).

Each option carries complete economic information: the buyer price, the driver compensation, the Maysar margin, and the fulfillment cost breakdown. Feasibility gates run first and eliminate options the system cannot actually fulfill — vehicle capacity, COD tier geographic limit, unsupported delivery area, consolidation unavailability. Only feasible options reach the ranking stage.

Ranking uses a weighted objective function across six dimensions: buyer cost, delivery time, vehicle utilization, failure probability, driver economics, and Maysar margin viability. Weights are operator-configurable and versioned — changing the weights requires creating a new configuration version. Old versions are never overwritten.

COD trust tier feeds directly into which options a buyer can see. A NEW_BUYER cannot access Maysar Shared options and cannot receive the flexible-window discount even if they choose a FLEXIBLE delivery window preference. A TRUSTED_BUYER and above can access all options. A GOLD_BUYER or above unlocks nationwide fulfillment including intercity express routes. The buyer's delivery window preference — FLEXIBLE, STANDARD, or EXPRESS — is recorded at checkout and threads through into the Shipment's requested delivery window, which affects which consolidation clusters the shipment is eligible to join.

---

## Payments: every method, with real protections

The platform supports Mpesa, Airtel Money, Tigo Pesa, Halopesa, internal wallet, bank transfer, card, and COD. Each payment method follows its own execution path.

For non-COD payments, fraud scoring runs per transaction. Fraud signals include IP address geolocation and VPN detection, device fingerprint, payment history including chargebacks, order velocity, account age, COD refusal history, and delivery address risk. The composite score determines the outcome: scores below 30 are auto-approved, 30–59 are approved with enhanced monitoring, 60–79 route to manual review, 80–84 are auto-declined and flagged, and 85 or above trigger account block. Velocity limits also apply independently: more than five transactions in five minutes, more than twenty in an hour, or more than fifty in a day are each a hard block regardless of score. Accounts flagged at high risk enter cooling-off periods before sensitive operations can resume.

The key design invariant across all payment methods is that money moves before the order record is created. For wallet payments, the debit is synchronous and precedes order creation — if the debit throws, no order is saved. For COD, a hold is placed on the buyer's wallet to cover the commitment fee before the order is written to the database. If the hold fails, no order is created. If the order save fails after the hold, the saga compensation releases the hold. Each saga step has a defined compensating action.

The wallet entity enforces correctness through optimistic locking and a version counter that must match on every write. Concurrent operations against the same wallet are protected with distributed Redis-backed locks. The wallet tracks balance, frozen amount (the portion locked for COD commitments and holds), available balance (balance minus frozen), and COD commitment usage independently — these figures are never conflated. Operations are: credit, debit (checks available balance), place hold (time-limited, increases frozen), release hold, capture hold (converts to a permanent debit), use COD commitment (increases frozen and tracks commitment count), and release COD commitment.

The order fulfillment saga orchestrates the full sequence: stock reservation → payment processing → delivery assignment. Each step has a compensation action. Stock reservation failure before payment means no money ever moves. Payment failure after stock reservation releases the reservation. Logistics failure after payment triggers payment refund. The saga processes the entire path or rolls back cleanly; there is no partial success state that persists without a corresponding compensation.

Dispute resolution is structured by category. Non-delivery disputes trigger a delivery status check — if the delivery is not confirmed, a full refund is issued; if it is, delivery proof is requested from the courier. Wrong-item disputes require photo evidence from the buyer. Payment disputes trigger verification against the gateway records and wallet. COD disputes are resolved against OTP logs and GPS coordinates — if the OTP was accepted at the correct location, funds are released; if not, funds are held pending investigation. Every resolution path produces audit records and notifies all parties.

---

## Catalog, discovery, and the seller's competitive environment

The product catalog is built around the reality of multi-seller commerce: the same physical product may be listed by dozens of sellers simultaneously. Maysar treats this correctly by maintaining a canonical product in the catalog and linking individual seller offers to it as variants rather than as separate products. When a seller uploads a new listing, the system generates a product fingerprint and checks for duplicates before creating a new catalog entry. A duplicate detected at publish time produces a link to the existing canonical entry, not a new one. This keeps search results clean and buy-box competition meaningful.

Product discovery runs through MeiliSearch, which indexes all published products with full-text relevance ranking. Sellers can control product status through a defined lifecycle: draft, active, archived. Inventory is validated at publish time — a product with no stock linkage cannot go live.

Seller storefronts expose conversion signals to buyers directly: seller trust score, average delivery time, stock status, whether COD is accepted, and business verification badge. These are not marketing labels; each one is computed from real behavioral data maintained by the platform.

Product-level analytics are available to sellers: daily sales history, product performance by variant, inventory health, low-stock alerts, and recommended actions. Buy-box score snapshots are stored for every recomputation so sellers can understand exactly when and why they won or lost the featured position.

---

## The enabler network: distributed sales capacity

One of the distinctive structural choices in Maysar's design is the enabler — a certified field agent who promotes products, assists buyers through the purchase process, and onboards new sellers to the platform. This role exists because commerce in Tanzania does not always happen through a buyer independently browsing a digital interface. It often happens through relationships, recommendations, and assisted transactions. The enabler network is designed to put that social infrastructure to work within a system that pays fairly and attributes accurately.

An enabler is not a referral code holder. They are a verified role, approved by the platform, trained through a certification process that is a hard business gate before they can earn. Training completion events, certification awards, and approval state changes are published to the event bus — the system knows at every moment whether an enabler is eligible to earn.

Sellers can opt individual products into the enabler commission system, setting a commission rate that applies when an assisted sale is attributed to a specific enabler. The enabler shares a product link containing their enabler code. When a buyer follows that link and completes a purchase, the order records the attributing enabler. The commission is calculated against the seller's configured rate and credited to the enabler's wallet after order completion is confirmed.

Two hard integrity rules apply. First, an enabler cannot earn commission on their own purchase — the system rejects self-referencing attribution at attribution time, not at payout time. Second, commission is only paid when both attribution and order completion are confirmed — a completed attribution that did not result in a delivered order does not pay out.

The platform tracks enabler performance: sales assisted, sellers onboarded, commission earned, training status, certification history. This data is the basis on which the enabler's standing and access within the network are maintained.

---

## Commerce communication: the chat layer

Maysar includes a full commerce communication layer, because the question that precedes most purchases — is this available, what is the exact condition, can you deliver to my area — is a conversation, not a search query. Removing that conversation from the platform means it happens on WhatsApp or phone calls outside any system of record, with no protection for either party.

The chat system is not a general messenger. Every conversation is context-linked to a product, order, shipment, or supplier contract, and that context travels with every message. There are four conversation types: BUYER_SELLER (initiated from a product page), SELLER_SUPPLIER (for restocking coordination), BUYER_COURIER (scoped to a single delivery, automatically created when a courier is assigned and automatically archived when the order reaches DELIVERED or CANCELLED), and SELLER_TEAM.

Message types go beyond text. A seller can send a PRODUCT_CARD — the system snapshots the product's title, price, stock status, and add-to-cart URL at the moment of sending, making the snapshot immutable. If the price changes after the message was sent, the card continues to show what was offered at the time. A buyer or courier can send a LOCATION_PIN with coordinates and a label for delivery coordination. A seller can send a QUICK_ACTION button — CONFIRM_AVAILABILITY, REQUEST_QUOTE, TRACK_ORDER, ACCEPT_OFFER, DECLINE_OFFER — that gives the buyer a structured interaction rather than a free-text reply.

Voice notes are a first-class message type. This is a deliberate design choice for East African commerce, where voice is often the preferred medium. The system accepts OGG/OPUS or M4A audio up to 300 seconds and 15MB. Upload happens before the message is sent, so the message record points to a stored media URL from the moment it is created.

Negotiation mode produces single-use checkout URLs inside conversations. When a seller sends a quote bundle through the QUICK_ACTION mechanism, the system generates a checkout link that expires in 24 hours and is valid for one use. The buyer can accept the offer and complete the purchase directly from the conversation. Maysar gets the order. The conversation becomes the originating context for a real commercial transaction.

The risk engine scores every text message before delivery. A score below 70 delivers normally. A score between 70 and 89 delivers with a flagged indicator visible to moderators. A score of 90 or above blocks delivery entirely — the message is not shown to the recipient and the sender receives a `message_blocked` WebSocket event. Scoring signals include external URL density, phishing domain matching against a Redis-backed blocklist managed by the admin team, message frequency, and mass-messaging pattern detection. The blocklist takes effect immediately on update — no deployment is required.

Rate limits apply per user within a rolling 60-minute window: 20 new conversations and 200 messages. Raw phone numbers are stripped from all API responses at the serialization layer — phone masking is enforced at the protocol boundary, not by convention.

Messages are retained for a minimum of 365 days. Soft-deleted messages replace their content with a placeholder but retain the record for dispute evidence purposes. Courier-buyer conversations are auto-archived on delivery event, not on a schedule.

Real-time delivery uses WebSockets with a Redis Pub/Sub fan-out layer. Messages are persisted to PostgreSQL first, then published to the Redis channel. On WebSocket connection, the server delivers all unread messages since the participant's last-read timestamp — a client reconnecting after an offline period receives everything it missed without requiring explicit synchronization.

---

## Supplier B2B: the supply chain behind the marketplace

Sellers are not always the producers of what they sell. Many work with manufacturers and wholesalers to keep inventory available. Maysar includes a supplier-facing layer that connects sellers with suppliers for bulk procurement, production coordination, and inventory restocking — keeping the supply chain relationship inside the platform rather than in scattered phone calls and emails.

Suppliers operate a production service: they create production plans against demand signals read from the order system, allocate capacity, and move orders into progress through explicit approval stages. Quality checkpoints are recorded at each stage — a checkpoint that fails produces a rework request, not a silent rejection. Completed batches sync to inventory only after a checkpoint passes.

The Seller↔Supplier communication channel is a SELLER_SUPPLIER chat conversation (described above in the chat section), where a seller can initiate a restocking request by sending a PRODUCT_CARD for the item they need to replenish. The conversation context links directly to supplier request records. Bulk order quoting, lead times, and production capacity snapshots are visible to both parties through the platform. This keeps commercial terms recorded and attributed rather than informal and undocumented.

---

## Maysar Request: sourcing commerce that doesn't yet exist in the catalog

The standard marketplace flow assumes the product the buyer wants is already listed. A buyer searches, finds it, adds to cart, and checks out. This works when supply is fully represented on the platform.

It does not work when a buyer needs six ergonomic office chairs, a CCTV installation kit with specific specs, or production-grade packaging materials for a small manufacturer — items that may not be listed, may require sourcing from external suppliers Maysar has not yet onboarded, or may need a multi-item bundle quoted as a single fulfillable solution. In those cases, the standard catalog flow forces buyers back to searching offline and calling contacts — which means the transaction happens outside the platform, without any of Maysar's trust, payment, or logistics guarantees.

Maysar Request is how we close that gap.

A buyer submits a sourcing request: a title, a natural-language description of what they need (written in their own words, in Swahili or English), a delivery address, an optional budget, and optional attachments. The request does not require a catalog product ID. The requirement can be anything the buyer can describe. The system accepts it as-is. Once submitted, the request enters an assessed queue where Maysar's operations team evaluates it.

The assessment determines whether the request is fulfillable. The assessor can mark it FULFILLABLE, send it back to the buyer with a clarification request (NEEDS_CLARIFICATION) — which the buyer responds to through the request's conversation thread, after which assessment resumes — or mark it UNFULFILLABLE with a specific reason. An UNFULFILLABLE request can never be quoted. The gate is enforced at the entity level: the system will not allow a quote to be created against a request that was assessed as unfulfillable, regardless of what the provider submits.

Once a request is marked FULFILLABLE, the provider creates a quote. The quote carries line items (description, quantity, unit price), an internal procurement cost (visible only to operations), a logistics cost, a customer-facing selling price, a delivery date, a warranty note, and a validity window. The system enforces one hard invariant at quote creation time: the selling price must be greater than or equal to the sum of procurement cost and logistics cost. A quote that would sell below cost is rejected before it is saved. DRAFT quotes are invisible to customers — the customer-facing quote list filters to PUBLISHED and later states only.

Before a quote can be published, the Phase 2 sourcing gate must pass. Every line item in the quote must have a confirmed source — either a CONFIRMED supplier record in the supplier registry, or a designation as Maysar inventory. A source with PENDING or UNAVAILABLE availability cannot back a published quote. The publish use case validates all item sources at publish time and rejects the operation if any item lacks a confirmed source. This means Maysar cannot present an offer to a customer for something it does not yet have a confirmed path to procure. The sourcing gate is server-enforced, not a UI convention.

The supplier registry maintains records of known suppliers and suppliers discovered through previous requests. Discovered suppliers carry a reference to the originating request, which means the system builds an auditable record of where each supplier relationship originated. Suppliers in this registry are fulfillment sources — they are never customer-facing, never have a platform auth account, and never appear in any customer-visible response payload. The structural separation between suppliers and sellers is enforced through explicit mapper layers that key-absence test in CI: any customer-facing payload that includes a procurement cost, a provider ID, or a supplier record fails its test suite.

Once the quote is published, a secure assessment link is generated. This is a 32-byte cryptographically random token, base64url-encoded. Only the SHA-256 hash of the token is stored in the database — the raw token is shown exactly once at generation time, to the provider generating it. The link binds to a specific customer, a specific quote, and a specific request. Access links are single-use: resolving the link for review does not consume it, but accepting the quote to create an order marks it USED immediately. A consumed link returns LINK_CONSUMED on any subsequent access. An expired link returns LINK_EXPIRED. Neither of these is a generic error — they are domain states, each with a specific HTTP 410 response code and a defined UI recovery path.

The assessment link is how the buyer reviews and accepts the offer. The link is sent to the buyer through WhatsApp, SMS, or email. The buyer opens it — no login required, the token is the credential — and sees the mapped quote: line items, selling price, delivery date, warranty note, and validity window. Procurement cost, provider identity, and supplier details are structurally absent from this payload. The buyer confirms, and `POST /api/request/requests/assess/:token/convert` is called.

The conversion is idempotent and transactional. Inside a single database transaction, the use case creates a normal `Order_Order` record with `Order_OrderItem` rows for each line item. Non-catalog items are assigned synthetic product IDs (`req-item-<quoteId>-<index>`) and their free-text descriptions are stored on the order item record, so the buyer's order history shows exactly what they bought. The seller of record on every Request order is Maysar — not an external supplier, not the individual who assessed the request. One counterparty for the buyer, always. After the order is created, the quote is marked CONVERTED, the request is marked CONVERTED, and the access link is marked USED — all atomically, in the same transaction. The operation is idempotent: a unique constraint on `Order_Order.requestQuoteId` means a second conversion attempt for the same quote returns the existing order ID with `created: false` rather than creating a duplicate. Double-clicks, network retries, and page refreshes cannot produce two orders.

After conversion, the order proceeds through Maysar's standard payment and fulfillment infrastructure — COD, wallet, card, or mobile money payment, standard delivery via the logistics engine, OTP confirmation, and the full post-delivery trust scoring pipeline. No new payment path exists for Request orders. No parallel order system. The same infrastructure that handles a catalog purchase handles a request purchase.

Alongside the order, one procurement record is created per line item — mapping the order to the specific supplier source at the agreed price. This is Maysar-internal bookkeeping. The operations team can advance each procurement record through PENDING → ORDERED → RECEIVED or FAILED, tracking the supply side of the fulfillment separately from the customer-facing order. The customer never sees procurement records.

The request's conversation thread is append-only throughout the lifecycle. Every status transition automatically posts a system message to the thread — "your request is being assessed," "a quote is ready for review," "your order has been created." Customer and provider messages coexist in the same thread. No messages can be deleted or edited — the full history of every request conversation is permanently preserved, including for dispute evidence.

Quote immutability is a hard design principle. A PUBLISHED quote row never changes. If the provider needs to reprice — supplier costs changed, logistics estimate was wrong — publishing a revision creates a new quote row and marks the original SUPERSEDED. The superseded quote can never be converted. The customer's quote list shows only current, unexpired, published quotes. A customer who cached a quote price in their UI and tries to convert an old quote ID will receive a rejection, not a silent repricing. What was quoted is what was purchased.

The request system is live and green: 103 tests pass across 12 test suites, including a full end-to-end test that walks create → assess → quote → publish → link → convert → idempotent second convert, verifying at each step that internal cost fields are structurally absent from customer payloads, that the created order is a normal `Order_Order` readable by existing order queries, and that the second conversion returns the existing order rather than creating a new one.

---

## KYC: identity verification as a progressive gate

KYC on Maysar is not a one-time checkbox. It is a progressive gate that governs how much of the platform each participant can use, calibrated to what they have verified about themselves.

Every user starts at KYC level 0. At this level, the system allows enough participation to complete first transactions — up to 5 product listings, 10 transactions, and TZS 100,000 in earnings — without requiring identity documents upfront. KYC is prompted after the first order, not before it. This is a deliberate design choice: requiring full identity verification before a user can make their first purchase is a friction pattern that reduces conversion and disproportionately disadvantages new participants with no track record. The system gives people a chance to demonstrate intent before demanding documentation.

Level 1 verification — full name and national ID — expands access to 20 listings, 50 transactions, and TZS 500,000 in earnings. Level 2 extends this further to 100 listings, 500 transactions, and TZS 5,000,000. Level 3, the full verification tier, removes practical limits: 9,999 listings, 9,999 transactions, and TZS 50,000,000 in earnings capacity.

The KYC evaluation service assesses each submission against the user's current activity profile. It aggregates: total orders, total listings, current wallet balance, and total transactions — and evaluates whether the current level is appropriate given that activity. When a user's activity approaches the limits of their current level, the system triggers a level requirement event that prompts them to complete the next tier of verification.

KYC completion is wired directly into the COD trust system. When an admin approves a KYC submission, the `kyc-service` publishes a `kyc.status_changed` event with the new status and level. The order service subscribes and maps a successful KYC verification to a trust signal — specifically `ACCOUNT_AGE_MILESTONE`, which adds 7 points to the buyer's behavioral trust score. KYC is therefore not isolated infrastructure; it is a concrete input to the COD eligibility model.

Every KYC action — submission, approval, rejection, level change — is written to an append-only audit log (`kyc_AuditLog`) recording the user, the action, and the operator who performed it. This log is exposed to compliance officers through the compliance facade endpoints and is the evidentiary record for any regulatory review.

The compliance surface also exposes: pending manual review cases (KYC submissions in PENDING status awaiting a compliance officer decision), audit log retrieval with pagination, and KYC status lookup per user. These are the tools through which the compliance team exercises oversight — not through direct database access, but through defined, audited endpoints.

---

## Support service: structured resolution, not informal handling

Every platform that handles real money and real delivery will have things go wrong. The measure of a trustworthy system is not whether problems occur — they will — but whether the path from problem to resolution is visible, accountable, and consistent.

The support service provides three distinct surfaces: a ticket system for buyer and seller issues, a dispute resolution system for contested transactions, and an agent management system for the support team itself.

Tickets are created through a structured flow: a user opens a ticket through their own authenticated session, which creates a record with an auto-assigned priority. The ticket has a full message thread — each message is attached to the ticket record with a timestamp, author, and optional attachments. An agent or admin assigns the ticket to a support agent. The agent resolves it, providing a resolution record. The user or agent closes it. Each step is an explicit state transition — there is no ambiguity about where a ticket stands.

SLA enforcement is built into the lifecycle. If a ticket is not assigned or resolved within its SLA window, the system publishes an `EscalationTriggered` event and notifies the queue manager. Escalation is not a manual decision; it is an automatic outcome of a time constraint being violated.

The support service also runs a saga recovery worker that polls for stuck saga states every sixty seconds. Any ticket lifecycle saga that has been in progress longer than five minutes without advancing is flagged for recovery. This means a ticket whose underlying saga stalled due to a transient infrastructure failure will be automatically reattempted rather than silently stuck.

Disputes are handled through a separate dispute route that integrates with the order and payment services. A dispute resolution that requires a refund triggers the payment service to issue the refund or reversal, which in turn triggers the wallet service to release held funds if applicable — all atomic, all producing audit events. The resolution outcome is recorded on the order, the affected parties are notified through the notification service, and the full audit trail is preserved.

Agent management gives administrators the ability to assign agents to queues, track assignment history, and manage agent availability — the internal tooling that makes the support operation run.

---

## Training service: capability gates enforced through completion, not self-reporting

Certain roles on the platform — enablers in particular — cannot access their full earning capability until they have completed specified training modules. Training completion is a hard capability gate, enforced through the certification requirement system, not through trust or self-attestation.

The training service maintains a module library: each module has a content type (TEXT, VIDEO, INTERACTIVE), structured content sections, a duration estimate, a difficulty level (BEGINNER, INTERMEDIATE, ADVANCED), target roles, prerequisites, and a category. Modules can be authored and managed by admins through a full CRUD interface. Content can be updated section by section without replacing the entire module.

Certification requirements define what a learner must achieve against a specific module: the minimum score to pass (default 60), the validity period in days before recertification is required (default 365), whether the requirement is mandatory, and the maximum number of attempts allowed (default 5). These requirements are versioned — updating a requirement creates a new version rather than retroactively invalidating existing certifications.

A learner starts a training module, tracks progress through it, and completes it. Completion triggers an eligibility check: the system evaluates whether all mandatory certification requirements for the learner's target role have been met. If they have, the learner becomes eligible for the capabilities gated behind that certification. The `CertificationAwarded` event is published, which the enabler service consumes to update the enabler's status from registered to approved and fully operational.

Eligibility degrades over time. If a certification's validity period expires and the learner has not recertified, the system revokes the associated capability. This is not a warning — it is an automatic gate that returns the learner to the pre-certification state until they complete the renewal.

Admin overrides exist for exceptional circumstances: an admin can grant eligibility directly without module completion, and can reset all training records for a learner. Both operations are logged with the actor and timestamp.

Training progress is queryable per learner and per module, with enrollment counts and status distributions available for operational reporting.

---

## Maps service: Tanzania's geography as first-class infrastructure

The maps service provides the geographic computation layer that every delivery, eligibility check, and route optimization in the system depends on. It is not a thin wrapper around a third-party API. It is a registered provider architecture with four distinct capabilities: routing, real-time tracking, traffic conditions, and weather data.

Routing is backed by Google Maps in production but the architecture uses an adapter interface — `GoogleMapsRoutingAdapter` registers as the routing provider, but any compliant provider can be substituted. In development mode, the service runs with a development key that falls back to the local Tanzania ward database for distance calculations, which means route estimates and COD eligibility checks work correctly offline without an external API dependency.

Real-time tracking provides courier position updates used by the delivery state machine and the buyer-facing order tracking view. Traffic conditions feed into ETA calculations for delivery job scheduling and the route insertion optimization engine. Weather data is an input to logistics cost adjustments when external conditions are a recognized surcharge category.

Geographic zone management is the function that connects the maps service to the buy-box ranking engine. Zone-aware scoring in the buy-box uses delivery success rates and delivery speed scores from the buyer's geographic zone — but only when that zone has accumulated at least five completed deliveries, preventing premature signal distortion from sparse data. The zone data itself is derived from the local Tanzania ward database of 3,054 wards, which means zone boundaries align with how Tanzania's administrative geography is actually organized rather than with arbitrary radius circles.

The COD eligibility radius checks — 24 km for NEW_BUYER, 50 km for TRUSTED_BEGINNER — use Haversine great-circle distance between ward centroids computed from the same local dataset. These checks do not depend on the maps service being online; they are pure geometric calculations against static local data.

---

## Analytics service: the platform's operational memory

The analytics service is not a dashboard layer bolted on top of the system. It is an active event consumer with its own processing engines for each participant type, and it is the source of the operational metrics that govern platform behavior.

The service initializes four separate saga pipelines on startup: a SellerAnalyticsSaga, a CourierAnalyticsSaga, a SupplierAnalyticsSaga, and an EnablerAnalyticsSaga. Each subscribes to its relevant event types through the event bus and processes them through dedicated analytics engines. Seller events feed the SellerAnalyticsEngine; courier events feed the CourierAnalyticsEngine; enabler events feed the EnablerAnalyticsEngine. The general AnalyticsProcessingEngine handles cross-cutting metrics using a MetricCalculationService and a StatisticalAlgorithm for rolling averages and trend detection.

Seller analytics produces: daily sales history, monthly revenue and growth rate, product performance by variant, conversion funnel metrics, inventory health signals, low-stock and out-of-stock alerts, and SLA compliance scores. These are surfaced through the seller dashboard and are used by the buy-box ranking engine — specifically, the 90-day rolling fulfillment rate and COD refusal rate signals in the composite score are computed from analytics data with exponential recency weighting.

Courier analytics tracks completion rate, average delivery time per zone, earnings per job, and active hours. These feed the fairness KPIs in the logistics engine: driver earnings per active hour is monitored against the minimum hourly rate threshold, and alerts fire when any active driver falls below that threshold for three or more consecutive days.

Enabler analytics tracks assisted sales, sellers onboarded, commission earned, training completion rates, and productivity scores per enabler. This data is the basis for the enabler leaderboard and the platform's measurement of network health.

Supplier analytics tracks production throughput, quality checkpoint pass rates, bulk order lead times, and inventory sync accuracy.

The admin dashboard aggregates across all four dimensions and provides a platform-level view of commercial health: total GMV, active order count, payment success rates, logistics performance, support ticket volume, and fraud flag rates. The KPI endpoints for the logistics fairness engine (`GET /api/logistics/internal/kpis`) read from analytics data — buyer cost-to-fulfillment ratios, vehicle utilization averages, consolidation savings totals, and route revenue-per-kilometre trends.

Prometheus metrics are exported per service. The analytics service publishes its own `/metrics` endpoint alongside the primary routes, feeding the alerting system that monitors P99 latency, error rates, saga failure rates, and outbox lag across the platform.

---

## Notification service: every platform event reaches its recipient

The notification service is the delivery layer for every system-generated communication: order confirmations, payment receipts, delivery updates, COD OTP codes, KYC status changes, support ticket updates, commission credits, quote availability alerts, and assessment link deliveries.

The service supports three delivery channels: SMS via Africa's Talking, email via the email provider adapter, and push notifications via the push provider adapter. Channel selection follows a preference-resolution policy: the user's stored notification preferences determine which channel is used for each notification category. A user who has opted out of push notifications for order updates but kept SMS enabled will receive order updates by SMS only. Preferences are stored per user per notification type and are updatable at any time.

The delivery saga runs per notification. A notification record is created in PENDING status. The delivery saga attempts to send via the resolved channel. On success, the record transitions to DELIVERED and a `NotificationDelivered` event is published. On failure, the saga schedules a retry. Retries are managed by a SagaRecoveryWorker that polls every sixty seconds for notifications stuck in progress longer than five minutes — the same recovery pattern used in the support and order services. After exhausting retries, the notification transitions to FAILED and a `NotificationPendingRetry` event flags it for operator review.

Three distinct saga types handle different delivery patterns. The NotificationDeliverySaga handles individual notifications. The BatchNotificationSaga handles bulk sends — platform announcements, operational alerts to multiple recipients. The ScheduledNotificationSaga handles time-deferred notifications: a quote expiring in 24 hours triggers a scheduled notification that fires at the configured lead time before expiry.

Phone number masking enforced in the chat service is mirrored here: delivery addresses in notification records are the actual destination values, but raw phone numbers are never logged or serialized in responses — only referenced internally by the delivery adapters.

Templates are version-controlled through the service: a template record defines the subject line, body structure, and variable placeholders for a given notification type. Template changes create new versions rather than overwriting existing ones, ensuring historical notifications can be reproduced from the template version active at send time. This is the same append-only versioning principle applied throughout the platform's financial and pricing systems, extended to communications.

The SMS sub-module is initialized as a separate component within the notification service, with its own health endpoint and provider container. This separation allows SMS infrastructure to be updated or replaced independently of the email and push infrastructure without affecting the notification service's core behavior.

---

## Governance service: constitutional compliance as executable infrastructure

The governance service exists to answer one question at any moment: is the platform operating within the bounds of its own stated commitments?

This is built as a constitutional inspection engine. The service loads a phase constitution document — a versioned, machine-readable file that defines the gates the platform must pass to be considered compliant with its current launch phase. Each gate has an ID, a category, a severity threshold, a verification method, and the conditions that constitute a pass or fail.

The service runs inspectors against the live platform — not against test data, not against mocks, but against the actual running system. The current inspector set covers: HTTP endpoint liveness checks (OPS1.1, OPS1.2), node script report validation (R1.1, R1.2), filesystem round-trip integrity (OPS1.3), search index round-trip (OPS1.4), auth-user sync verification (D1.1), wallet ledger integrity (FIN1.1), service readiness checks against all 14 core services (OPS1.5), Phase 2 live feature gates (F2.1 through F2.8 — COD trust system, buy-box ranking, phone OTP), Phase 3 live feature gates (F3.1 through F3.10, D3.1 through D3.4 — chat system, request service, logistics three-engine cost model), and Phase 4 live feature gates (F4.2, F4.3, F4.5, OPS4.1, OPS4.2, D4.2 — enabler network, supplier B2B, KYC trust integration).

Service readiness checks probe the `/health/ready` endpoint of every core service in the platform: auth, user, order, payment, wallet, inventory, logistics, notification, commission, checkout, KYC, business registry, maps, and catalog. If any service is not ready, the governance gate OPS1.5 fails with the specific service identified. This creates a live deploy gate: the platform cannot be considered constitutionally compliant if any core service is not reporting ready.

Inspection results are stored as immutable runs in a report store. Each run captures: the gate ID, the pass/fail verdict, the severity classification, a human-readable summary, evidence references (API responses, snapshots, script outputs), and timestamps. The full run history is queryable through the governance API. This means the platform has a permanent, independently auditable record of every constitutional inspection it has undergone.

The governance controller exposes: a list of current phase gates and their status, the full run history, individual gate detail, the latest run verdict, and the ability to trigger a new inspection run on demand. Reports are available in machine-readable form for CI/CD integration.

The CI/CD pipeline uses the governance service as a release gate: a deployment to production is blocked unless the governance service reports an APPROVED verdict for all P0 gates. This means every production deploy is a constitutional inspection that runs against the live environment, not just a test environment, before traffic is shifted.

---

## The end-to-end test suite: commercial claims as machine-verified facts

The test suites run in three tiers. P0 tests are the deploy gate — they must pass on every deployment or the deploy is blocked. P1 tests run daily in CI and represent the full operational surface. P2 tests run weekly and cover enforcement boundaries and edge cases.

The P0 suite proves: all six user roles (buyer, seller, supplier, courier, enabler, admin) can authenticate and their sessions are immediately valid; a buyer can discover products, place a wallet-payment order, and see the order state correctly; a cancelled order fully restores the wallet balance — saga compensation executes correctly; COD orders exceeding the NEW_BUYER exposure limit of TZS 30,000 are rejected with a 4xx; the full checkout-to-delivery saga completes end-to-end for wallet orders; the platform answers `/health` with a 200 status.

The P1 suite adds: the full COD lifecycle including OTP verification and wallet commitment capture; exact wallet arithmetic — a credit of TZS X increases balance by exactly TZS X, a debit decreases it by exactly TZS X, a debit exceeding available balance is rejected without changing balance; duplicate requests with the same idempotency key credit only once; seller storefront and product list are accessible and correctly scoped; enabler profile, referral link generation, and earnings endpoints are live; courier delivery state machine transitions; the delivery route optimization endpoint; supplier production plan and quality checkpoint endpoints; commission rate calculation with input validation; admin user lookup and wallet balance read; support ticket creation and KYC status lookup; chat conversation creation and message exchange.

The P2 suite adds: the delivery state machine rejects backwards transitions with a 4xx and leaves state unchanged — this is the proof that monotonic delivery progression is enforced; concurrent COD order blocking for NEW_BUYER tier; out-of-radius delivery address rejection; multiple order-cancel cycles leave no orphaned wallet balance; admin credit action is reversible and wallet history is accessible.

These are not smoke tests. They run against a real backend with a real PostgreSQL database and real seeded users. No mocking. When the P0 suite passes, the specific commercial claims it covers are machine-verified as true in the actual running system, not in a simulated environment.

The test suite is structured to mirror the platform's business flywheel:

- Buyer trust → auth, customer, refund, and COD trust tests
- Seller growth → seller, checkout saga, and wallet tests
- Supplier alignment → supplier-production tests
- Courier execution → delivery and checkout saga (COD OTP) tests
- Enabler attribution → enabler and commission tests
- Platform integrity → wallet, platform-ops, and admin tests
- Governance → admin and support tests
- Communication → chat tests

Each layer depends on the ones below it. A failure in auth breaks everything above it. A failure in wallet breaks order settlement. The layered structure makes the failure surface immediately clear.

---

## The platform as observable infrastructure

The 22 services that compose Maysar communicate through an in-process event bus backed by an append-only outbox table in each service's database. The outbox pattern guarantees that an event is either committed with its originating business operation or not committed at all — there is no state where the business operation succeeded but the downstream event was lost. The outbox processor polls every five seconds, delivers events to the bus, and retries up to five times with 30-second intervals before moving a failed event to a dead-letter queue. Every published event carries a correlation ID, an idempotency key, and a version tag so that duplicate delivery (from retries) is a no-op rather than a double-action.

All 22 services are instrumented with Prometheus metrics: request latency histograms, error rate counters, saga failure rates, event processing delay, database query latency, and cache hit/miss rates. Distributed tracing runs through OpenTelemetry with spans across HTTP requests, database queries, event publishing, and saga steps. Alerts fire when P99 latency exceeds 500 milliseconds, when error rate exceeds 1%, when the saga failure rate exceeds 0.1%, when the outbox lag exceeds 100 pending events, or when database connection pools are exhausted.

The operational standard for this system is that any production incident can be diagnosed from logs, traces, and metrics without guessing. Every commercial outcome — every payment, every delivery, every commission, every adjustment — is an event record with a correlation ID that can be traced from origin to resolution.

---

## What we have built

As of September 2026, the core platform is live. The following systems are implemented, tested, and verified against the live database:

The buyer-facing marketplace: product search and discovery through MeiliSearch, buy-box ranking with the nine-signal composite engine and category-specific weight strategies, full order lifecycle from cart through payment through delivery through settlement, COD trust scoring with the dual-axis five-tier model and identity graph, per-order dynamic risk assessment, and the full payment suite (Mpesa, Airtel Money, Tigo Pesa, Halopesa, wallet, bank transfer, card, COD) with fraud scoring and saga-based compensation.

The seller and supplier layer: business registration with full KYC/AML/TRA/TCRA compliance, product catalog with fingerprinting and variant management, inventory management with reservation and reconciliation, campaign and pricing rules, seller analytics dashboard, and the production service for bulk order management.

The enabler network: profile management, training and certification system with business gate enforcement, assisted sale attribution through encoded product links, and commission calculation and settlement.

The communication layer: full chat system across four conversation types with text, image, voice notes, product cards, location pins, quick-action buttons, negotiation mode with single-use checkout URLs, real-time WebSocket delivery, Redis Pub/Sub fan-out, spam scoring and phishing detection, and automatic courier conversation archiving.

The logistics optimization engine: 72 tasks implemented and live-verified, covering zone-aware delivery pricing through an 11-stage pipeline with a three-engine separation layer (FulfillmentCostEngine, DriverCompensationEngine, BuyerPriceEngine), the Shipment and DeliveryJob domain objects with enforced state machines, vehicle capability model with versioned append-only tariffs, multi-option fulfillment generation (Supplier Delivery, Maysar Shared, Maysar Express, Customer Pickup), configurable option ranking with a weighted six-dimension objective function, COD trust tier integration into logistics eligibility, driver matching with composite scoring and minimum earnings gate, route insertion optimization, the continuous shipment pool with a five-minute pool optimization job, immutable cost adjustment attribution, append-only logistics ledger with version references on every entry, price lock on checkout confirmation, and the fairness engine with FairnessFlag records for escalation.

All critical flows are covered by property-based tests running against formal correctness specifications in CI: COD trust model invariants, pricing pipeline determinism, wallet operation consistency, consolidation eligibility rules, fulfillment option ranking, and chat access control and rate-limit atomicity.

---

## Why this matters at this moment

The window for building trusted commerce infrastructure in Tanzania is real and finite. As more participants move into digital commerce, the patterns that get established early — whether buyers and sellers are treated fairly, whether prices are transparent, whether a new buyer with no prior history can earn access to the system through demonstrated good behavior, whether a courier's compensation is computed honestly and protected by a hard floor — will shape how commerce develops for years.

Maysar is not the only platform that will operate in this space. We are trying to be the one that gets the foundational design right.

That means a COD trust model that builds buyer capacity through demonstrated behavior rather than punishing all buyers for the actions of bad actors. It means a buy-box algorithm that rewards sustained reliability over temporary price manipulation. It means a logistics engine that treats driver compensation as a constraint to be honored, not a variable to minimize. It means a chat system designed for how East African commerce actually communicates, not how a Western product manager assumes it does. It means an enabler network that puts distributed sales capacity to work while paying everyone fairly and attributing every contribution accurately.

The goal is infrastructure. Not just a product, but a reliable substrate on which buyers can trust sellers, sellers can trust buyers, couriers can trust the platform, enablers can trust that their work is attributed, and the platform demonstrates through its own behavior that it treats all participants fairly.

That is the work we are doing. We intend to earn the trust the system is designed to extend.

---

*This document describes Maysar's purpose, design principles, and current implementation state as of September 2026. Capabilities described reflect what is built and verified unless otherwise indicated.*
