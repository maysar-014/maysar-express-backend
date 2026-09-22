# Buyer Guide — Community Service

> Mirrors: `docs/FLOWS/community/user-flow/buyer-flows.md`
> Verification status: Mostly Missing
> Last updated: September 2026

## ⚠️ Known Gap — Community Features Temporarily Unavailable

Most community-service routes return route-level 404. Do not build UI that calls these endpoints.

**UI treatment for any community section:**
```
"Community features are temporarily unavailable.
Check back soon."
```

Show a coming-soon placeholder instead of attempting to load community content. Do not show loading spinners that time out into errors — use a static placeholder.

Routes confirmed Missing:
- `GET /api/community/articles`
- `POST /api/community/articles`
- `GET /api/community/challenges` and sub-routes
- `GET /api/community/knowledge`
- Most discussion sub-routes

Investigate core feed/post routes (`GET /api/community/feed`) before building — they may be Partially Verified.
