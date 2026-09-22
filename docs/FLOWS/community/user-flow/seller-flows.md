# Seller Flows — Community Service

> **Verification status:** Mostly Missing (route-level 404 for most routes)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026)
> **Last updated:** September 2026

## Overview

Same status as buyer community flows. Most community-service routes return route-level 404 in the September 2026 sweep. This document records the Known Gap and provides UI fallback guidance.

---

## Known Gap — Community Service Routes (Mostly Missing)

> ⚠️ **Most community-service routes return route-level 404 (Missing) in the September 2026 sweep.**
> Community features are not currently available.
>
> Routes confirmed Missing (route-level 404):
> - `GET /api/community/articles` and all knowledge article sub-routes
> - `POST /api/community/articles`
> - `GET /api/community/challenges` and all challenge sub-routes
>
> **UI fallback:** Display "Community features temporarily unavailable" for all community-related sections.
>
> **Tracked in:** `docs/FLOWS/_verification/analysis-report.md` (September 2026 sweep)

---

## Intended Behavior (Background Context Only)

When community routes are active, sellers would be able to:
- Create posts and share product knowledge
- Write and publish knowledge articles
- Propose and participate in community challenges
- Respond to buyer discussions

Do not build UI that calls these routes until they are confirmed active.
