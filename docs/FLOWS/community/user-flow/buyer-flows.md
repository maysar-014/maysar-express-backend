# Buyer Flows — Community Service

> **Verification status:** Mostly Missing (route-level 404 for most routes)
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026)
> **Last updated:** September 2026

## Overview

Most community-service routes return route-level 404 in the September 2026 sweep. Core feed/post routes may be Partially Verified but have not been confirmed. This document records the Known Gap and provides UI fallback guidance.

---

## Known Gap — Community Service Routes (Mostly Missing)

> ⚠️ **Most community-service routes return route-level 404 (Missing) in the September 2026 sweep.**
> The community feature is not currently available to users.
>
> Routes confirmed Missing (route-level 404):
> - `GET /api/community/articles` and all knowledge article sub-routes
> - `POST /api/community/articles`
> - `GET /api/community/challenges` and all challenge sub-routes
> - `GET /api/community/knowledge`
> - Most `/api/community/discussions` sub-routes
>
> Core feed and post routes (`GET /api/community/feed`, `POST /api/community/posts`) may be Partially Verified — investigate before building UI.
>
> **UI fallback:** Display "Community features temporarily unavailable" for all community-related sections.
>
> **Tracked in:** `docs/FLOWS/_verification/analysis-report.md` (September 2026 sweep — community-service section)

---

## Intended Behavior (Background Context Only — Not Currently Available)

When community routes are active, buyers would be able to:
- Browse posts and discussions
- View and rate knowledge articles
- Participate in community challenges
- Follow sellers and engage with community content

Do not build UI that calls these routes until they are confirmed active.
