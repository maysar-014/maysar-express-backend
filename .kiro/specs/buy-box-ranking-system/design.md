# Design Document: Buy Box Ranking System

## Overview

The Buy Box Ranking System replaces Maysar's naive weighted-score model with a multi-signal, context-aware ranking engine that determines which seller's offer is shown by default when multiple sellers list the same product. The current model over-weights price (40%), creating a race to the bottom that drives out quality sellers and ignores critical trust signals.

The new system adopts a philosophy shift: **the Buy Box optimises for long-term marketplace trust and successful commerce — not merely lowest price.** It introduces category-level weight strategies, recency-weighted rolling averages, fraud/manipulation detection, controlled seller rotation for fairness, geographic optimisation for Tanzania's delivery landscape, COD failure risk signals, and platform margin contribution. The system is designed to evolve toward ML-based contextual scoring.

The feature is implemented within the **catalog-service**, following the existing DDD layered architecture. It extends the existing `BuyBox` and `Catalog_BuyBoxAlternative` Prisma models and adds new tables for score snapshots, category strategies, anomaly flags, operator overrides, and geographic zone performance.

### Key Design Decisions

1. **Pre-computed scores, not real-time** — Composite scores are computed on a schedule (every 6 hours) and on-demand triggers (score delta > 5 points), then persisted. Product page loads read from `catalog_buy_boxes` without any ranking computation.
2. **Signal pipeline architecture** — Each scoring signal is computed by an independent `SignalComputer` class, making it easy to add, remove, or tune signals without touching the core scoring engine.
3. **Category strategies as database configuration** — Weight profiles are stored in a `Catalog_CategoryStrategy` table, not hardcoded. Operators can update them via the admin API without a deployment.
4. **Immutable score snapshots** — Every computation writes a `Catalog_ScoreSnapshot` record capturing all signal values, weights, and the resulting score. This enables audit replay and dispute resolution.
5. **Fraud detection as a pre-pass** — The `FraudDetector` runs before score computation and annotates signal inputs with anomaly flags. The scoring engine substitutes rolling averages for flagged signals.
6. **Geographic context is optional** — When a buyer's delivery zone is known, zone-specific signal adjustments are applied. When unknown, platform-wide averages are used. This keeps the ranking path consistent.
7. **Exploration via deterministic slot allocation** — The 10% exploration budget is allocated deterministically based on a weekly window counter, not randomly, ensuring reproducible assignment history for audit.
